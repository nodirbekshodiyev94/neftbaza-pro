"""NeftBaza Pro API — PostgreSQL bilan ishlaydigan endpointlar."""
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from models import (
    AuditLog, DiscrepancyApproval, Document, DocumentLine, Measurement,
    MovementLedger, Product, Role, Shift, Tank, User,
)

app = FastAPI(title="NeftBaza Pro API")

# TTN massasi va hisoblangan massa orasidagi ruxsat etilgan farq, %.
# Bundan katta farqli hujjat administrator tasdig'isiz provodka qilinmaydi.
# Haqiqiy qiymat talablar hujjatidan (tabiiy yo'qotish normalari) olinishi kerak.
DISCREPANCY_LIMIT_PCT = Decimal("0.5")


class TankOut(BaseModel):
    id: int
    code: str
    product: str | None
    capacity_l: Decimal
    balance_kg: Decimal


class VolumeOut(BaseModel):
    tank_id: int
    level_mm: int
    volume_l: Decimal


class PostedLineOut(BaseModel):
    tank: str
    mass_kg: Decimal
    balance_after_kg: Decimal


class PostingOut(BaseModel):
    document_id: int
    number: str
    status: str
    lines: list[PostedLineOut]


async def current_balance(session: AsyncSession, tank_id: int) -> Decimal:
    """Rezervuarning joriy qoldig'i: ledger'dagi oxirgi yozuv (yozuv bo'lmasa 0)."""
    value = await session.scalar(
        select(MovementLedger.balance_after_kg)
        .where(MovementLedger.tank_id == tank_id)
        .order_by(MovementLedger.id.desc())
        .limit(1)
    )
    return value if value is not None else Decimal("0")


def db_error_text(error: DBAPIError) -> str:
    """Baza qaytargan xatoning asl matnini olish (masalan, trigger xabari)."""
    original = error.orig.__cause__ if error.orig is not None else None
    if getattr(original, "sqlstate", None) == "23505":          # UNIQUE buzildi
        return "Bunday raqamli hujjat shu neftbazada allaqachon mavjud"
    return getattr(original, "message", None) or str(error.orig)


@app.get("/health")
async def health(session: AsyncSession = Depends(get_session)):
    """Bazaga ulanish ishlayaptimi — tekshirish."""
    row = (await session.execute(
        text("SELECT current_database() AS db, current_user AS usr, version() AS ver")
    )).one()
    return {"status": "ok", "database": row.db, "user": row.usr, "postgres": row.ver.split(",")[0]}


@app.get("/tanks", response_model=list[TankOut])
async def list_tanks(session: AsyncSession = Depends(get_session)):
    """Rezervuarlar ro'yxati va har birining joriy qoldig'i (ledger'dagi oxirgi yozuv)."""
    latest_balance = (
        select(MovementLedger.balance_after_kg)
        .where(MovementLedger.tank_id == Tank.id)
        .order_by(MovementLedger.id.desc())
        .limit(1)
        .correlate(Tank)
        .scalar_subquery()
    )
    stmt = (
        select(
            Tank.id,
            Tank.code,
            Product.name.label("product"),
            Tank.capacity_l,
            func.coalesce(latest_balance, 0).label("balance_kg"),
        )
        .outerjoin(Product, Product.id == Tank.product_id)
        .order_by(Tank.code)
    )
    rows = (await session.execute(stmt)).mappings().all()
    return [TankOut(**r) for r in rows]


@app.get("/tanks/{tank_id}/volume", response_model=VolumeOut)
async def tank_volume(
    tank_id: int,
    level_mm: int = Query(ge=0, description="O'lchangan sath, mm"),
    session: AsyncSession = Depends(get_session),
):
    """Kalibrovka jadvali bo'yicha sathdan hajmni hisoblash (bazadagi calc_volume_l funksiyasi)."""
    volume = await session.scalar(select(func.neftbaza.calc_volume_l(tank_id, level_mm)))
    if volume is None:
        raise HTTPException(
            status_code=422,
            detail="Sath kalibrovka jadvali chegarasidan tashqarida yoki rezervuar uchun jadval yo'q",
        )
    return VolumeOut(tank_id=tank_id, level_mm=level_mm, volume_l=volume)


async def load_lines(session: AsyncSession, doc: Document) -> list[DocumentLine]:
    """Hujjat qatorlarini o'qish va provodkaga yaroqliligini tekshirish."""
    lines = (await session.scalars(
        select(DocumentLine)
        .where(DocumentLine.document_id == doc.id)
        .order_by(DocumentLine.id)
    )).all()
    if not lines:
        raise HTTPException(422, f"{doc.number} hujjatida qatorlar yo'q")
    if any(l.calc_mass_kg is None or l.calc_volume_l is None for l in lines):
        raise HTTPException(422, "Hujjatning ba'zi qatorlarida hisoblangan hajm yoki massa yo'q")
    return list(lines)


def max_deviation(lines: list[DocumentLine]) -> Decimal | None:
    """Qatorlar orasidagi eng katta tafovut (TTN bilan hisoblangan massa farqi), %.

    Ishorasi saqlanadi: +5.79 — hisoblangan massa TTN'dagidan ko'p, -0.10 — kam.
    TTN massasi yo'q qatorlar hisobga olinmaydi.
    """
    deviations = [
        (l.calc_mass_kg - l.doc_mass_kg) / l.doc_mass_kg * 100
        for l in lines
        if l.doc_mass_kg
    ]
    if not deviations:
        return None
    worst = max(deviations, key=abs)
    return worst.quantize(Decimal("0.001"), ROUND_HALF_UP)


async def write_ledger(session: AsyncSession, doc: Document,
                       lines: list[DocumentLine]) -> list[PostedLineOut]:
    """Qatorlarni Movement Ledger'ga yozish va hujjatni 'posted' holatiga o'tkazish.

    Tranzaksiya ichida chaqiriladi: bu yerdagi har qanday xato hammasini bekor qiladi.
    """
    # Rezervuarlarni id tartibida bloklaymiz (tartib bir xil bo'lsa, deadlock bo'lmaydi)
    tank_ids = sorted({l.tank_id for l in lines})
    tanks = {
        t.id: t
        for t in (await session.scalars(
            select(Tank).where(Tank.id.in_(tank_ids)).order_by(Tank.id).with_for_update()
        )).all()
    }

    posted = []
    for line in lines:
        balance = await current_balance(session, line.tank_id)
        mass_change = line.direction * line.calc_mass_kg
        new_balance = balance + mass_change
        if new_balance < 0:
            raise HTTPException(
                409, f"{tanks[line.tank_id].code} rezervuarida {balance} kg bor, "
                     f"{line.calc_mass_kg} kg chiqim qilib bo'lmaydi"
            )
        session.add(MovementLedger(
            document_line_id=line.id,
            tank_id=line.tank_id,
            product_id=line.product_id,
            shift_id=doc.shift_id,
            volume_l=line.direction * line.calc_volume_l,
            mass_kg=mass_change,
            balance_after_kg=new_balance,
        ))
        await session.flush()   # keyingi qator yangi qoldiqni ko'rishi uchun
        posted.append(PostedLineOut(
            tank=tanks[line.tank_id].code,
            mass_kg=mass_change,
            balance_after_kg=new_balance,
        ))

    doc.status = "posted"
    return posted


@app.post("/documents/{document_id}/post", response_model=PostingOut,
          responses={202: {"description": "Tafovut chegaradan oshdi — administrator tasdig'i kutilmoqda"}})
async def post_document(document_id: int, session: AsyncSession = Depends(get_session)):
    """Qoralama hujjatni provodka qilish: har bir qator Movement Ledger'ga yoziladi.

    Agar TTN va hisoblangan massa orasidagi farq chegaradan oshsa, provodka qilinmaydi:
    hujjat 'pending_approval' holatiga o'tadi va 202 javobi qaytadi.
    """
    needs_approval = False
    try:
        async with session.begin():
            # Hujjatni bloklaymiz: ikki kishi bir vaqtda provodka qila olmasin
            doc = await session.scalar(
                select(Document).where(Document.id == document_id).with_for_update()
            )
            if doc is None:
                raise HTTPException(404, f"{document_id} raqamli hujjat topilmadi")
            if doc.status == "pending_approval":
                raise HTTPException(
                    409, f"{doc.number} hujjati administrator tasdig'ini kutmoqda. "
                         f"Qaror POST /documents/{doc.id}/approval orqali qabul qilinadi"
                )
            if doc.status != "draft":
                raise HTTPException(
                    409, f"{doc.number} hujjati '{doc.status}' holatida. "
                         f"Faqat 'draft' holatidagi hujjatni provodka qilish mumkin"
                )

            lines = await load_lines(session, doc)
            deviation = max_deviation(lines)

            if deviation is not None and abs(deviation) > DISCREPANCY_LIMIT_PCT:
                # Provodka qilmaymiz, faqat holatni o'zgartiramiz (bu o'zgarish saqlanadi)
                doc.status = "pending_approval"
                needs_approval = True
            else:
                posted = await write_ledger(session, doc, lines)
    except DBAPIError as error:
        # Baza qoidasi ishladi (masalan, yopilgan smena triggeri) — xabarni foydalanuvchiga qaytaramiz
        raise HTTPException(409, db_error_text(error))

    if needs_approval:
        # 202 = "so'rov qabul qilindi, lekin ish hali yakunlanmadi"
        return JSONResponse(status_code=202, content={
            "document_id": doc.id,
            "number": doc.number,
            "status": "pending_approval",
            "deviation_pct": str(deviation),
            "limit_pct": str(DISCREPANCY_LIMIT_PCT),
            "message": f"Tafovut {deviation}% ruxsat etilgan ±{DISCREPANCY_LIMIT_PCT}% chegaradan oshdi. "
                       f"Provodka uchun administrator tasdig'i kerak",
        })

    return PostingOut(document_id=doc.id, number=doc.number, status=doc.status, lines=posted)


# ---------------------------------------------------------------------------
# Hujjat yaratish (zamerlar asosida)
# ---------------------------------------------------------------------------
class LineIn(BaseModel):
    tank_id: int
    doc_mass_kg: Decimal = Field(gt=0, description="TTN bo'yicha massa, kg")
    level_before_mm: int = Field(ge=0, description="Operatsiyadan oldingi sath, mm")
    level_after_mm: int = Field(ge=0, description="Operatsiyadan keyingi sath, mm")
    density: Decimal = Field(gt=0, description="O'lchangan zichlik, kg/m3")
    temperature_c: Decimal | None = Field(default=None, ge=-60, le=100)


class DocumentIn(BaseModel):
    doc_type: Literal["receipt", "shipment"]
    number: str = Field(min_length=1, max_length=50)
    doc_date: date | None = None              # bo'sh bo'lsa — bugungi sana
    ttn_number: str | None = None
    lines: list[LineIn] = Field(min_length=1)

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "doc_type": "receipt",
                "number": "KR-0002",
                "ttn_number": "TTN-55001",
                "lines": [{
                    "tank_id": 1,
                    "doc_mass_kg": 3080,
                    "level_before_mm": 730,
                    "level_after_mm": 1130,
                    "density": 745,
                    "temperature_c": 17.5,
                }],
            }]
        }
    }


class LineOut(BaseModel):
    line_id: int
    tank: str
    volume_l: Decimal
    mass_kg: Decimal
    doc_mass_kg: Decimal
    deviation_pct: Decimal


class DocumentOut(BaseModel):
    document_id: int
    number: str
    doc_type: str
    status: str
    shift_id: int
    lines: list[LineOut]


THREE_PLACES = Decimal("0.001")


@app.post("/documents", response_model=DocumentOut, status_code=201)
async def create_document(data: DocumentIn, session: AsyncSession = Depends(get_session)):
    """Kirim yoki chiqim hujjatini zamerlar asosida yaratish (holati: draft).

    Hajm kalibrovka jadvalidan, massa esa hajm × zichlik formulasi bilan hisoblanadi.
    Provodka qilish uchun keyin POST /documents/{document_id}/post chaqiriladi.
    """
    direction = 1 if data.doc_type == "receipt" else -1

    try:
        async with session.begin():
            # 1) Rezervuarlarni tekshiramiz: hammasi mavjud va bitta neftbazada bo'lishi kerak
            tank_ids = {l.tank_id for l in data.lines}
            tanks = {
                t.id: t
                for t in (await session.scalars(select(Tank).where(Tank.id.in_(tank_ids)))).all()
            }
            missing = tank_ids - tanks.keys()
            if missing:
                raise HTTPException(404, f"Rezervuar topilmadi: {sorted(missing)}")
            depot_ids = {t.depot_id for t in tanks.values()}
            if len(depot_ids) > 1:
                raise HTTPException(422, "Bitta hujjatdagi rezervuarlar bitta neftbazaga tegishli bo'lishi kerak")
            depot_id = depot_ids.pop()
            for t in tanks.values():
                if t.product_id is None:
                    raise HTTPException(422, f"{t.code} rezervuariga mahsulot biriktirilmagan")

            # 2) Neftbazaning ochiq smenasini topamiz
            shift = await session.scalar(
                select(Shift).where(Shift.depot_id == depot_id, Shift.status == "open")
            )
            if shift is None:
                raise HTTPException(409, "Neftbazada ochiq smena yo'q. Avval smenani oching")

            # 3) Hujjatning o'zi. Avtorizatsiya hali yo'q, shuning uchun muallif —
            #    smenani ochgan operator (JWT qo'shilgach, joriy foydalanuvchi bo'ladi)
            doc = Document(
                doc_type=data.doc_type,
                number=data.number.strip(),
                doc_date=data.doc_date or date.today(),
                depot_id=depot_id,
                shift_id=shift.id,
                ttn_number=data.ttn_number,
                created_by=shift.opened_by,
            )
            session.add(doc)
            await session.flush()          # doc.id ni olish uchun

            # 4) Har bir qator: hajm va massani hisoblaymiz, zamerlarni saqlaymiz
            result_lines = []
            for line in data.lines:
                tank = tanks[line.tank_id]
                if direction == 1 and line.level_after_mm <= line.level_before_mm:
                    raise HTTPException(422, f"{tank.code}: kirimda keyingi sath oldingisidan katta bo'lishi kerak")
                if direction == -1 and line.level_after_mm >= line.level_before_mm:
                    raise HTTPException(422, f"{tank.code}: chiqimda keyingi sath oldingisidan kichik bo'lishi kerak")

                vol_before = await session.scalar(
                    select(func.neftbaza.calc_volume_l(tank.id, line.level_before_mm)))
                vol_after = await session.scalar(
                    select(func.neftbaza.calc_volume_l(tank.id, line.level_after_mm)))
                if vol_before is None or vol_after is None:
                    raise HTTPException(422, f"{tank.code}: sath kalibrovka jadvali chegarasidan tashqarida")

                volume = abs(vol_after - vol_before)
                mass = (volume * line.density / 1000).quantize(THREE_PLACES, ROUND_HALF_UP)
                deviation = ((mass - line.doc_mass_kg) / line.doc_mass_kg * 100).quantize(
                    THREE_PLACES, ROUND_HALF_UP)

                doc_line = DocumentLine(
                    document_id=doc.id,
                    tank_id=tank.id,
                    product_id=tank.product_id,
                    direction=direction,
                    doc_mass_kg=line.doc_mass_kg,
                    calc_volume_l=volume,
                    calc_mass_kg=mass,
                )
                session.add(doc_line)
                await session.flush()      # doc_line.id ni olish uchun

                for kind, level in (("before_op", line.level_before_mm), ("after_op", line.level_after_mm)):
                    session.add(Measurement(
                        tank_id=tank.id,
                        shift_id=shift.id,
                        document_line_id=doc_line.id,
                        kind=kind,
                        level_mm=level,
                        temperature_c=line.temperature_c,
                        density=line.density,
                    ))

                result_lines.append(LineOut(
                    line_id=doc_line.id,
                    tank=tank.code,
                    volume_l=volume,
                    mass_kg=mass,
                    doc_mass_kg=line.doc_mass_kg.quantize(THREE_PLACES),
                    deviation_pct=deviation,
                ))
    except DBAPIError as error:
        raise HTTPException(409, db_error_text(error))

    return DocumentOut(
        document_id=doc.id,
        number=doc.number,
        doc_type=doc.doc_type,
        status="draft",
        shift_id=shift.id,
        lines=result_lines,
    )


# ---------------------------------------------------------------------------
# Tafovutni tasdiqlash (administrator qarori)
# ---------------------------------------------------------------------------
class ApprovalIn(BaseModel):
    decision: Literal["approved", "rejected"]
    reason: str = Field(min_length=5, description="Qaror sababi (majburiy)")
    admin_login: str = Field(description="Vaqtincha: JWT qo'shilgach, tizimga kirgan foydalanuvchidan olinadi")

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "decision": "approved",
                "reason": "Zichlik qayta o'lchandi, farq harorat ta'sirida yuzaga kelgan",
                "admin_login": "admin1",
            }]
        }
    }


class ApprovalOut(BaseModel):
    document_id: int
    number: str
    decision: str
    status: str
    deviation_pct: Decimal
    decided_by: str
    lines: list[PostedLineOut]


@app.post("/documents/{document_id}/approval", response_model=ApprovalOut)
async def decide_discrepancy(document_id: int, data: ApprovalIn,
                             session: AsyncSession = Depends(get_session)):
    """Tafovutli hujjat bo'yicha administrator qarori.

    approved — hujjat darhol provodka qilinadi; rejected — hujjat bekor qilinadi (cancelled).
    Qaror discrepancy_approvals jadvaliga, iz esa audit_log'ga yoziladi.
    """
    reason = data.reason.strip()
    if len(reason) < 5:
        raise HTTPException(422, "Qaror sababini yozing (kamida 5 belgi)")

    try:
        async with session.begin():
            doc = await session.scalar(
                select(Document).where(Document.id == document_id).with_for_update()
            )
            if doc is None:
                raise HTTPException(404, f"{document_id} raqamli hujjat topilmadi")
            if doc.status != "pending_approval":
                raise HTTPException(
                    409, f"{doc.number} hujjati '{doc.status}' holatida. "
                         f"Qaror faqat 'pending_approval' holatidagi hujjat uchun qabul qilinadi"
                )

            # Kim qaror qilyapti? Faqat faol administrator
            row = (await session.execute(
                select(User, Role.code)
                .join(Role, Role.id == User.role_id)
                .where(func.lower(User.login) == data.admin_login.strip().lower())
            )).first()
            if row is None or not row.User.is_active:
                raise HTTPException(404, f"'{data.admin_login}' foydalanuvchisi topilmadi yoki faol emas")
            admin, role_code = row.User, row.code
            if role_code != "admin":
                raise HTTPException(403, "Tafovutni faqat administrator tasdiqlashi yoki rad etishi mumkin")

            lines = await load_lines(session, doc)
            deviation = max_deviation(lines) or Decimal("0")

            session.add(DiscrepancyApproval(
                document_id=doc.id,
                deviation_pct=deviation,
                decision=data.decision,
                reason=reason,
                decided_by=admin.id,
            ))

            if data.decision == "approved":
                posted = await write_ledger(session, doc, lines)
            else:
                doc.status = "cancelled"
                posted = []

            session.add(AuditLog(
                user_id=admin.id,
                entity="documents",
                entity_id=doc.id,
                action=f"discrepancy_{data.decision}",
                reason=reason,
                changes={
                    "old_status": "pending_approval",
                    "new_status": doc.status,
                    "deviation_pct": str(deviation),
                },
            ))
    except DBAPIError as error:
        raise HTTPException(409, db_error_text(error))

    return ApprovalOut(
        document_id=doc.id,
        number=doc.number,
        decision=data.decision,
        status=doc.status,
        deviation_pct=deviation,
        decided_by=admin.full_name,
        lines=posted,
    )

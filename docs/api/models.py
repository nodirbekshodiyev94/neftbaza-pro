"""ORM modellari. Hozircha endpointlar uchun kerakli 12 ta jadval.

Jadvallar SQL skript orqali yaratilgan, shuning uchun bu yerda faqat
ularni Python klasslariga "bog'laymiz". CHECK, trigger va indekslar
bazaning o'zida turibdi, ularni bu yerda takrorlash shart emas.
"""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Identity, Numeric, SmallInteger, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Depot(Base):
    __tablename__ = "depots"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    code: Mapped[str]
    name: Mapped[str]
    address: Mapped[str | None]
    is_active: Mapped[bool]


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    code: Mapped[str]
    name: Mapped[str]


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    depot_id: Mapped[int | None] = mapped_column(ForeignKey("depots.id"))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    login: Mapped[str]
    full_name: Mapped[str]
    is_active: Mapped[bool]
    # password_hash ataylab bog'lanmagan: kod uni tasodifan javobga qo'shib yubormasin


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    code_1c: Mapped[str]
    name: Mapped[str]
    density: Mapped[Decimal] = mapped_column(Numeric(8, 3))


class Tank(Base):
    __tablename__ = "tanks"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    depot_id: Mapped[int] = mapped_column(ForeignKey("depots.id"))
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"))
    code: Mapped[str]
    capacity_l: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    status: Mapped[str]


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    depot_id: Mapped[int] = mapped_column(ForeignKey("depots.id"))
    opened_by: Mapped[int]
    closed_by: Mapped[int | None]
    opened_at: Mapped[datetime] = mapped_column(server_default=func.now())
    closed_at: Mapped[datetime | None]
    status: Mapped[str]


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    doc_type: Mapped[str]
    number: Mapped[str]
    doc_date: Mapped[date]
    depot_id: Mapped[int] = mapped_column(ForeignKey("depots.id"))
    shift_id: Mapped[int]
    counterparty_id: Mapped[int | None]
    ttn_number: Mapped[str | None]
    status: Mapped[str] = mapped_column(server_default="draft")
    created_by: Mapped[int]


class DocumentLine(Base):
    __tablename__ = "document_lines"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"))
    tank_id: Mapped[int] = mapped_column(ForeignKey("tanks.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    direction: Mapped[int] = mapped_column(SmallInteger)          # +1 kirim, -1 chiqim
    doc_mass_kg: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    calc_volume_l: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    calc_mass_kg: Mapped[Decimal | None] = mapped_column(Numeric(14, 3))
    no_measurements: Mapped[bool] = mapped_column(server_default="false")


class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    tank_id: Mapped[int] = mapped_column(ForeignKey("tanks.id"))
    shift_id: Mapped[int] = mapped_column(ForeignKey("shifts.id"))
    document_line_id: Mapped[int | None] = mapped_column(ForeignKey("document_lines.id"))
    kind: Mapped[str]                       # before_op, after_op, shift_open, ...
    level_mm: Mapped[int]
    temperature_c: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    density: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    measured_at: Mapped[datetime] = mapped_column(server_default=func.now())


class MovementLedger(Base):
    __tablename__ = "movement_ledger"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    document_line_id: Mapped[int]
    tank_id: Mapped[int] = mapped_column(ForeignKey("tanks.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    shift_id: Mapped[int]
    volume_l: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    mass_kg: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    balance_after_kg: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    posted_at: Mapped[datetime] = mapped_column(server_default=func.now())


class DiscrepancyApproval(Base):
    __tablename__ = "discrepancy_approvals"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"))
    deviation_pct: Mapped[Decimal] = mapped_column(Numeric(7, 3))
    decision: Mapped[str]                   # approved / rejected
    reason: Mapped[str]
    decided_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime] = mapped_column(server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    entity: Mapped[str]
    entity_id: Mapped[int]
    action: Mapped[str]
    reason: Mapped[str | None]
    changes: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

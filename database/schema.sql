-- =====================================================================
-- NeftBaza Pro — PostgreSQL sxemasi (ERD, 7-bo'lim asosida)
-- Talab: PostgreSQL 13+   (PostgreSQL 16 da sinovdan o'tgan)
-- Ishga tushirish:  psql -d neftbaza -f neftbaza_schema.sql
-- =====================================================================
-- ESLATMA: enum qiymatlari (doc_type, status, kind ...) taxminiy.
-- Ularni talablar hujjatidagi haqiqiy ro'yxat bilan almashtiring.
-- Zichlik birligi kg/m3 deb qabul qilingan.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS neftbaza;
SET search_path TO neftbaza, public;

-- ---------------------------------------------------------------------
-- 0. Umumiy funksiyalar
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Append-only jadvallar uchun: UPDATE va DELETE taqiqlanadi
CREATE OR REPLACE FUNCTION forbid_modification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% jadvali faqat qo''shish uchun (append-only): % taqiqlangan',
                  TG_TABLE_NAME, TG_OP;
END $$;

-- ---------------------------------------------------------------------
-- 1. Ma'lumotnomalar
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code  text NOT NULL UNIQUE,
  name  text NOT NULL
);

CREATE TABLE depots (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  address     text,                          -- ERD dagi "addres" xatosi tuzatildi
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code_1c     text NOT NULL UNIQUE,
  name        text NOT NULL,
  density     numeric(8,3) NOT NULL CHECK (density > 0),   -- kg/m3
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE counterparties (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code_1c     text NOT NULL UNIQUE,
  name        text NOT NULL,
  inn         text CHECK (inn ~ '^[0-9]{9}$'),             -- STIR: 9 raqam
  kind        text NOT NULL CHECK (kind IN ('supplier', 'customer', 'carrier', 'mixed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  depot_id       integer REFERENCES depots(id) ON DELETE RESTRICT,  -- NULL = barcha neftbazalar
  role_id        integer NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  login          text NOT NULL,
  password_hash  text NOT NULL,
  full_name      text NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- Login registrga sezgir bo'lmasin: "Admin" va "admin" bir xil hisoblanadi
CREATE UNIQUE INDEX users_login_ci_uq ON users (lower(login));

-- ---------------------------------------------------------------------
-- 2. Rezervuarlar va kalibrovka
-- ---------------------------------------------------------------------
CREATE TABLE tanks (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  depot_id    integer NOT NULL REFERENCES depots(id) ON DELETE RESTRICT,
  product_id  integer REFERENCES products(id) ON DELETE RESTRICT,   -- NULL = bo'sh rezervuar
  code        text NOT NULL,
  capacity_l  numeric(14,3) NOT NULL CHECK (capacity_l > 0),
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'maintenance', 'decommissioned')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depot_id, code)                    -- rezervuar raqami neftbaza ichida takrorlanmaydi
);

CREATE TABLE tank_calibration (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tank_id     integer NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
  level_mm    integer NOT NULL CHECK (level_mm >= 0),
  volume_l    numeric(14,3) NOT NULL CHECK (volume_l >= 0),
  valid_from  date NOT NULL,
  UNIQUE (tank_id, valid_from, level_mm)     -- bitta jadval versiyasida bir sath bir marta
);

-- ---------------------------------------------------------------------
-- 3. Smenalar
-- ---------------------------------------------------------------------
CREATE TABLE shifts (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  depot_id    integer NOT NULL REFERENCES depots(id) ON DELETE RESTRICT,
  opened_by   integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  closed_by   integer REFERENCES users(id) ON DELETE RESTRICT,
  opened_at   timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  -- yopilgan smenada closed_at va closed_by majburiy, ochiqda esa bo'sh
  CHECK (
    (status = 'open'   AND closed_at IS NULL     AND closed_by IS NULL) OR
    (status = 'closed' AND closed_at IS NOT NULL AND closed_by IS NOT NULL
                       AND closed_at >= opened_at)
  )
);
-- Bitta neftbazada bir vaqtda faqat BITTA ochiq smena (partial unique index)
CREATE UNIQUE INDEX shifts_one_open_per_depot_uq ON shifts (depot_id) WHERE status = 'open';

-- ---------------------------------------------------------------------
-- 4. Hujjatlar va hujjat qatorlari
-- ---------------------------------------------------------------------
CREATE TABLE documents (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_type         text NOT NULL
                   CHECK (doc_type IN ('receipt', 'shipment', 'transfer', 'inventory', 'blending')),
  number           text NOT NULL,
  doc_date         date NOT NULL,
  depot_id         integer NOT NULL REFERENCES depots(id) ON DELETE RESTRICT,
  shift_id         integer NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  counterparty_id  integer REFERENCES counterparties(id) ON DELETE RESTRICT,
  ttn_number       text,
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'pending_approval', 'posted', 'cancelled')),
  created_by       integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depot_id, doc_type, number)
);

CREATE TABLE document_lines (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id      bigint NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tank_id          integer NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
  product_id       integer NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  direction        smallint NOT NULL CHECK (direction IN (-1, 1)),   -- +1 kirim, -1 chiqim
  doc_mass_kg      numeric(14,3) CHECK (doc_mass_kg >= 0),           -- TTN bo'yicha
  calc_volume_l    numeric(14,3) CHECK (calc_volume_l >= 0),
  calc_mass_kg     numeric(14,3) CHECK (calc_mass_kg >= 0),
  no_measurements  boolean NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------
-- 5. Zamerlar
-- ---------------------------------------------------------------------
CREATE TABLE measurements (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tank_id           integer NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
  shift_id          integer NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  document_line_id  bigint REFERENCES document_lines(id) ON DELETE RESTRICT,  -- NULL = smena zameri
  kind              text NOT NULL
                    CHECK (kind IN ('shift_open', 'shift_close', 'before_op', 'after_op', 'control')),
  level_mm          integer NOT NULL CHECK (level_mm >= 0),
  temperature_c     numeric(5,2) CHECK (temperature_c BETWEEN -60 AND 100),
  density           numeric(8,3) CHECK (density > 0),                 -- kg/m3
  measured_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 6. Harakatlar jurnali (Movement Ledger) — append-only
-- ---------------------------------------------------------------------
CREATE TABLE movement_ledger (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_line_id  bigint NOT NULL REFERENCES document_lines(id) ON DELETE RESTRICT,
  tank_id           integer NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
  product_id        integer NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  shift_id          integer NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  volume_l          numeric(14,3) NOT NULL,          -- ishorali: + kirim, - chiqim
  mass_kg           numeric(14,3) NOT NULL,          -- ishorali
  balance_after_kg  numeric(14,3) NOT NULL CHECK (balance_after_kg >= 0),
  posted_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER movement_ledger_append_only
  BEFORE UPDATE OR DELETE ON movement_ledger
  FOR EACH ROW EXECUTE FUNCTION forbid_modification();

-- Smena bloklash: yopilgan smenaga provodka qilib bo'lmaydi
CREATE OR REPLACE FUNCTION check_shift_open() RETURNS trigger
LANGUAGE plpgsql
SET search_path = neftbaza, public   -- ulanishning search_path'iga bog'liq emas
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM shifts WHERE id = NEW.shift_id AND status = 'open') THEN
    RAISE EXCEPTION 'Smena % yopilgan — provodka taqiqlangan', NEW.shift_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER movement_ledger_shift_open
  BEFORE INSERT ON movement_ledger
  FOR EACH ROW EXECUTE FUNCTION check_shift_open();

-- ---------------------------------------------------------------------
-- 7. Tafovutlarni tasdiqlash
-- ---------------------------------------------------------------------
CREATE TABLE discrepancy_approvals (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id    bigint NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  deviation_pct  numeric(7,3) NOT NULL,
  decision       text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason         text NOT NULL CHECK (length(trim(reason)) > 0),   -- asoslash majburiy
  decided_by     integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decided_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 8. Audit jurnali — append-only
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     integer REFERENCES users(id) ON DELETE RESTRICT,   -- NULL = tizim jarayoni
  entity      text NOT NULL,
  entity_id   bigint NOT NULL,                                    -- int emas: ledger id bigint
  action      text NOT NULL,
  reason      text,
  changes     jsonb,                                              -- {"old": {...}, "new": {...}}
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_modification();

-- ---------------------------------------------------------------------
-- 9. 1C ga eksport navbati
-- ---------------------------------------------------------------------
CREATE TABLE export_1c_queue (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id      bigint NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  payload          xml NOT NULL,                                  -- CommerceML
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts         integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz,
  CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);

-- ---------------------------------------------------------------------
-- 10. updated_at triggerlari
-- ---------------------------------------------------------------------
CREATE TRIGGER depots_updated_at         BEFORE UPDATE ON depots         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at       BEFORE UPDATE ON products       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER counterparties_updated_at BEFORE UPDATE ON counterparties FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_updated_at          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tanks_updated_at          BEFORE UPDATE ON tanks          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER documents_updated_at      BEFORE UPDATE ON documents      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- 11. Indekslar
-- PostgreSQL FK ustunlariga indeksni AVTOMATIK yaratmaydi — qo'lda qo'shamiz.
-- ---------------------------------------------------------------------
CREATE INDEX users_depot_idx            ON users (depot_id);
CREATE INDEX users_role_idx             ON users (role_id);
CREATE INDEX tanks_product_idx          ON tanks (product_id);
-- tank_calibration(tank_id) UNIQUE(tank_id, valid_from, level_mm) bilan qoplangan
CREATE INDEX shifts_depot_opened_idx    ON shifts (depot_id, opened_at DESC);
CREATE INDEX shifts_opened_by_idx       ON shifts (opened_by);
CREATE INDEX shifts_closed_by_idx       ON shifts (closed_by);
CREATE INDEX documents_depot_date_idx   ON documents (depot_id, doc_date DESC);
CREATE INDEX documents_shift_idx        ON documents (shift_id);
CREATE INDEX documents_counterparty_idx ON documents (counterparty_id);
CREATE INDEX documents_created_by_idx   ON documents (created_by);
CREATE INDEX doc_lines_document_idx     ON document_lines (document_id);
CREATE INDEX doc_lines_tank_idx         ON document_lines (tank_id);
CREATE INDEX doc_lines_product_idx      ON document_lines (product_id);
CREATE INDEX measurements_tank_time_idx ON measurements (tank_id, measured_at DESC);
CREATE INDEX measurements_shift_idx     ON measurements (shift_id);
CREATE INDEX measurements_line_idx      ON measurements (document_line_id);
CREATE INDEX ledger_tank_id_idx         ON movement_ledger (tank_id, id DESC);   -- oxirgi qoldiq
CREATE INDEX ledger_line_idx            ON movement_ledger (document_line_id);
CREATE INDEX ledger_product_idx         ON movement_ledger (product_id);
CREATE INDEX ledger_shift_idx           ON movement_ledger (shift_id);
CREATE INDEX ledger_posted_brin         ON movement_ledger USING brin (posted_at);
CREATE INDEX approvals_document_idx     ON discrepancy_approvals (document_id);
CREATE INDEX approvals_decided_by_idx   ON discrepancy_approvals (decided_by);
CREATE INDEX audit_entity_idx           ON audit_log (entity, entity_id);
CREATE INDEX audit_user_idx             ON audit_log (user_id);
CREATE INDEX audit_created_brin         ON audit_log USING brin (created_at);
CREATE INDEX export_document_idx        ON export_1c_queue (document_id);
-- Faqat ishlanmagan yozuvlar indekslanadi (partial index)
CREATE INDEX export_pending_idx         ON export_1c_queue (next_attempt_at)
  WHERE status IN ('pending', 'failed');

-- ---------------------------------------------------------------------
-- 12. Kalibrovka jadvali bo'yicha hajmni hisoblash (chiziqli interpolyatsiya)
-- Sath (mm) va sana berilsa, o'sha sanada amal qiladigan jadval versiyasidan
-- hajmni (l) qaytaradi. Sath jadval chegarasidan tashqarida bo'lsa — NULL.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calc_volume_l(p_tank_id integer, p_level_mm integer,
                                         p_at date DEFAULT current_date)
RETURNS numeric LANGUAGE sql STABLE
SET search_path = neftbaza, public   -- ulanishning search_path'iga bog'liq emas
AS $$
  WITH ver AS (
    SELECT max(valid_from) AS vf
    FROM tank_calibration
    WHERE tank_id = p_tank_id AND valid_from <= p_at
  ),
  lo AS (
    SELECT c.level_mm, c.volume_l
    FROM tank_calibration c, ver
    WHERE c.tank_id = p_tank_id AND c.valid_from = ver.vf AND c.level_mm <= p_level_mm
    ORDER BY c.level_mm DESC LIMIT 1
  ),
  hi AS (
    SELECT c.level_mm, c.volume_l
    FROM tank_calibration c, ver
    WHERE c.tank_id = p_tank_id AND c.valid_from = ver.vf AND c.level_mm >= p_level_mm
    ORDER BY c.level_mm ASC LIMIT 1
  )
  SELECT round(
           CASE WHEN lo.level_mm = hi.level_mm THEN lo.volume_l
                ELSE lo.volume_l + (hi.volume_l - lo.volume_l)
                     * (p_level_mm - lo.level_mm)::numeric / (hi.level_mm - lo.level_mm)
           END, 3)
  FROM lo, hi;
$$;

COMMIT;

-- =====================================================================
-- NeftBaza Pro — test ma'lumotlari
-- schema.sql dan keyin, bo'sh bazada BIR MARTA bajariladi.
-- =====================================================================
BEGIN;
SET search_path TO neftbaza;

-- Ma'lumotnomalar
INSERT INTO roles (code, name) VALUES ('admin', 'Administrator'), ('operator', 'Operator');
INSERT INTO depots (code, name) VALUES ('ZRB', 'Zirabod neftbazasi');
INSERT INTO products (code_1c, name, density) VALUES ('000001', 'AI-92', 745);
INSERT INTO tanks (depot_id, product_id, code, capacity_l)
SELECT d.id, p.id, 'R-1', 50000 FROM depots d, products p
WHERE d.code = 'ZRB' AND p.code_1c = '000001';

-- Kalibrovka jadvali (R-1)
INSERT INTO tank_calibration (tank_id, level_mm, volume_l, valid_from)
SELECT t.id, v.level_mm, v.volume_l, DATE '2026-01-01'
FROM tanks t
CROSS JOIN (VALUES (0, 0), (1000, 10000), (2000, 21000)) AS v(level_mm, volume_l)
WHERE t.code = 'R-1';

-- Foydalanuvchilar (parol xeshlari vaqtinchalik)
INSERT INTO users (depot_id, role_id, login, password_hash, full_name)
SELECT d.id, r.id, v.login, 'vaqtincha-hash', v.full_name
FROM depots d
JOIN (VALUES ('operator1', 'operator', 'Test Operator'),
             ('admin1',    'admin',    'Test Administrator')) AS v(login, role, full_name) ON true
JOIN roles r ON r.code = v.role
WHERE d.code = 'ZRB';

-- Smena
INSERT INTO shifts (depot_id, opened_by)
SELECT d.id, u.id FROM depots d, users u
WHERE d.code = 'ZRB' AND u.login = 'operator1';

-- Kirim hujjati: sath 0 mm -> 1000 mm, TTN bo'yicha 7450 kg
INSERT INTO documents (doc_type, number, doc_date, depot_id, shift_id, created_by)
SELECT 'receipt', 'KR-0001', current_date, s.depot_id, s.id, s.opened_by
FROM shifts s WHERE s.status = 'open';

INSERT INTO document_lines (document_id, tank_id, product_id, direction,
                            doc_mass_kg, calc_volume_l, calc_mass_kg)
SELECT d.id, t.id, t.product_id, 1, 7450,
       calc_volume_l(t.id, 1000) - calc_volume_l(t.id, 0),
       (calc_volume_l(t.id, 1000) - calc_volume_l(t.id, 0)) * p.density / 1000
FROM documents d, tanks t, products p
WHERE d.number = 'KR-0001' AND t.code = 'R-1' AND p.id = t.product_id;

INSERT INTO measurements (tank_id, shift_id, document_line_id, kind, level_mm, temperature_c, density)
SELECT l.tank_id, d.shift_id, l.id, v.kind, v.level_mm, 18.5, 745
FROM document_lines l
JOIN documents d ON d.id = l.document_id
CROSS JOIN (VALUES ('before_op', 0), ('after_op', 1000)) AS v(kind, level_mm)
WHERE d.number = 'KR-0001';

-- Provodka (rezervuarni bloklab)
SELECT id FROM tanks WHERE code = 'R-1' FOR UPDATE;

INSERT INTO movement_ledger (document_line_id, tank_id, product_id, shift_id,
                             volume_l, mass_kg, balance_after_kg)
SELECT l.id, l.tank_id, l.product_id, d.shift_id,
       l.direction * l.calc_volume_l,
       l.direction * l.calc_mass_kg,
       COALESCE((SELECT m.balance_after_kg FROM movement_ledger m
                 WHERE m.tank_id = l.tank_id ORDER BY m.id DESC LIMIT 1), 0)
         + l.direction * l.calc_mass_kg
FROM document_lines l JOIN documents d ON d.id = l.document_id
WHERE d.number = 'KR-0001';

UPDATE documents SET status = 'posted' WHERE number = 'KR-0001';

COMMIT;

-- =====================================================================
-- Himoyalarni tekshirish: har bir buyruqni ALOHIDA bajaring.
-- Har biri XATO qaytarishi kerak — bu himoya ishlayotganini bildiradi.
-- =====================================================================
-- 1) Harakatlar jurnalini o'zgartirib bo'lmaydi:
-- UPDATE neftbaza.movement_ledger SET mass_kg = 0;
--
-- 2) Qoldiq manfiy bo'la olmaydi:
-- INSERT INTO neftbaza.movement_ledger (document_line_id, tank_id, product_id, shift_id,
--        volume_l, mass_kg, balance_after_kg)
-- SELECT l.id, l.tank_id, l.product_id, d.shift_id, -13423, -10000, 7450 - 10000
-- FROM neftbaza.document_lines l JOIN neftbaza.documents d ON d.id = l.document_id
-- WHERE d.number = 'KR-0001';
--
-- 3) Neftbazada ikkinchi ochiq smena bo'la olmaydi:
-- INSERT INTO neftbaza.shifts (depot_id, opened_by)
-- SELECT depot_id, opened_by FROM neftbaza.shifts WHERE status = 'open';

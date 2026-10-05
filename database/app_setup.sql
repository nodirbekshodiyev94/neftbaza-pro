-- 11-qadam. pgAdmin'da neftbaza bazasiga ulangan Query Tool'da
-- (postgres foydalanuvchisi bilan) to'liq bajaring: F5.

-- 1) Tuzatish: funksiyalar ulanishning search_path'iga bog'liq bo'lmasin
ALTER FUNCTION neftbaza.calc_volume_l(integer, integer, date) SET search_path = neftbaza, public;
ALTER FUNCTION neftbaza.check_shift_open() SET search_path = neftbaza, public;

-- 2) Ilova uchun cheklangan foydalanuvchi
CREATE ROLE neftbaza_app LOGIN PASSWORD 'PAROL';   -- haqiqiy parolni shu yerga yozing
GRANT CONNECT ON DATABASE neftbaza TO neftbaza_app;
GRANT USAGE ON SCHEMA neftbaza TO neftbaza_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA neftbaza TO neftbaza_app;
REVOKE UPDATE, DELETE ON neftbaza.movement_ledger, neftbaza.audit_log FROM neftbaza_app;

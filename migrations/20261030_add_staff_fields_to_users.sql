-- Staff register fields for the Employee Management module
-- Migration: 20261030_add_staff_fields_to_users.sql
--
-- The users table doubles as the staff register: one row per person, owning both
-- the login role/status and the HR profile shown in Employee Management.
-- Idempotent - safe to run more than once.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS staff_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS position VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hire_date DATE;

-- Staff codes are human readable and must be unique when supplied.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_staff_code
  ON users (staff_code)
  WHERE staff_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

-- Existing accounts predate hire tracking; use the account creation date so the
-- register has no misleading blanks.
UPDATE users
SET hire_date = created_at::date
WHERE hire_date IS NULL
  AND created_at IS NOT NULL;

COMMENT ON COLUMN users.staff_code IS 'Human readable staff number, unique when set';
COMMENT ON COLUMN users.position IS 'Job title used by the staff register';
COMMENT ON COLUMN users.department IS 'Department the staff member belongs to';
COMMENT ON COLUMN users.phone IS 'Contact phone number';
COMMENT ON COLUMN users.hire_date IS 'Employment start date, defaults from created_at for legacy rows';

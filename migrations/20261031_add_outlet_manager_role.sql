-- Outlet manager role: a login that is restricted to one outlet
-- Migration: 20261031_add_outlet_manager_role.sql
--
-- An outlet manager owns exactly one outlet (outlet_users assignment) and is
-- blocked from every head-office module. Safe to re-run: every step is
-- idempotent and policies are rebuilt from scratch.

-- 1. Allow 'outlet_manager' on users.role, replacing any existing role check.
DO $$
DECLARE
  existing record;
BEGIN
  FOR existing IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', existing.conname);
  END LOOP;

  EXECUTE $sql$
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'manager', 'salesman', 'cashier', 'staff', 'outlet_manager'))
  $sql$;
END $$;

-- 2. Repair schema drift. The creation migration declares these columns, but
--    the live table is missing assigned_at, which breaks ordered reads with
--    42703. Add every lifecycle column defensively.
ALTER TABLE outlet_users
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE outlet_users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE outlet_users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Fast lookup of a user's active outlet scope.
CREATE INDEX IF NOT EXISTS idx_outlet_users_active_user
  ON outlet_users (user_id)
  WHERE is_active = true;

-- 3. Authorization helper. Reading public.users from inside an RLS policy is
--    fragile when that table has its own policies, so the role check runs as a
--    SECURITY DEFINER function instead. Managers may also enroll staff.
CREATE OR REPLACE FUNCTION public.can_manage_outlet_assignments()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_outlet_assignments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_outlet_assignments() TO authenticated;

-- 4. Replace every existing policy with a known-good set. The old
--    "Allow admins to manage outlet_users" policy keyed off
--    auth.users.raw_user_meta_data, which is empty on these accounts, so every
--    insert failed with 42501.
DO $$
DECLARE
  existing record;
BEGIN
  FOR existing IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'outlet_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.outlet_users', existing.policyname);
  END LOOP;
END $$;

-- Everyone signed in may read assignments (the app resolves a login's outlet).
CREATE POLICY "Allow authenticated users to read outlet_users" ON outlet_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Administrators and managers own the assignments from Employee Management.
CREATE POLICY "Allow admins to manage outlet_users" ON outlet_users
  FOR ALL
  TO authenticated
  USING (public.can_manage_outlet_assignments())
  WITH CHECK (public.can_manage_outlet_assignments());

COMMENT ON COLUMN users.role IS 'admin, manager, salesman, cashier, staff or outlet_manager (single-outlet login)';
COMMENT ON TABLE outlet_users IS 'Outlet scope for a login. An outlet_manager must have exactly one active row.';

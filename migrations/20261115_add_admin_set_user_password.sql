-- Let an administrator or manager set a staff member's login password
-- Migration: 20261115_add_admin_set_user_password.sql
--
-- Supabase Auth keeps bcrypt hashes in auth.users.encrypted_password. The
-- browser only holds the anon key, so the Admin API is out of reach; this
-- SECURITY DEFINER function performs the same write from inside the database
-- and re-checks who is calling it. Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
-- pgcrypto lives in the extensions schema on Supabase, public elsewhere.
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  actor_role TEXT;
  actor_active BOOLEAN;
  target_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in before changing a login password.'
      USING ERRCODE = '42501';
  END IF;

  SELECT role, is_active
    INTO actor_role, actor_active
    FROM public.users
   WHERE id = auth.uid();

  IF actor_role IS NULL OR actor_role NOT IN ('admin', 'manager') OR actor_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Only an active administrator or manager can change a login password.'
      USING ERRCODE = '42501';
  END IF;

  IF new_password IS NULL OR length(new_password) < 6 THEN
    RAISE EXCEPTION 'The new password must be at least 6 characters.'
      USING ERRCODE = '22023';
  END IF;

  -- bcrypt silently truncates past 72 bytes, so refuse instead of storing half.
  IF length(new_password) > 72 THEN
    RAISE EXCEPTION 'The new password must be at most 72 characters.'
      USING ERRCODE = '22023';
  END IF;

  SELECT role INTO target_role FROM public.users WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'That staff record no longer exists.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Mirrors the register rule: managers never take control of an admin login.
  IF actor_role = 'manager' AND target_role = 'admin' THEN
    RAISE EXCEPTION 'Managers cannot change an administrator password.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE auth.users
     SET encrypted_password = crypt(new_password, gen_salt('bf', 10)),
         updated_at = NOW()
   WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That login no longer exists in authentication.'
      USING ERRCODE = 'P0002';
  END IF;

  -- Optional hardening: a password change can also drop live sessions by
  -- uncommenting the next line. Left off so staff are not signed out mid-shift.
  -- DELETE FROM auth.sessions WHERE user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_password(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_password(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_set_user_password(UUID, TEXT) IS
  'Sets a staff login password. Callable by active admin and manager roles only.';

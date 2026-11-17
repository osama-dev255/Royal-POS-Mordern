-- ============================================
-- Restore access to the Petty Cash Book
-- Date: 2026-11-17
-- Tables: outlet_petty_cash_transactions, outlet_petty_cash_settings
--
-- Symptom this fixes
--   Registered Outlets -> Expense Management -> Petty Cash shows a 0.00 balance
--   and "No petty cash transactions yet" while the rows are still in the table.
--
-- Cause
--   20261024_fix_outlet_petty_cash_rls.sql replaced the original permissive
--   policies with a role allow-list:
--       users.role = 'admin'  OR  active outlet_users row for auth.uid()
--   "admin" is a single hard-coded role name, so manager, outlet_manager and
--   super_admin logins match neither branch. A denied SELECT returns an empty
--   set with NO error, so the screen reports an empty book instead of a failure
--   (INSERTs against the same predicate fail with 42501). Petty cash is the only
--   table in this schema gated by role, which is why only this screen emptied
--   while the rest of the outlet pages kept working.
--
-- Fix
--   Use the access model the rest of the outlet tables already use - any active
--   staff account of this deployment, or an explicit outlet assignment - instead
--   of naming roles. USING and WITH CHECK stay identical so reads and writes
--   cannot diverge. Safe to re-run: every policy on both tables is dropped by
--   discovery before the new ones are created, so it also clears a policy
--   installed by a later revision of this file.
-- ============================================

-- 1. KEEP RLS ENABLED AND FORCED
-- ============================================
ALTER TABLE IF EXISTS outlet_petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS outlet_petty_cash_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS outlet_petty_cash_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS outlet_petty_cash_settings FORCE ROW LEVEL SECURITY;

-- 2. DROP EVERY EXISTING POLICY ON BOTH TABLES (by discovery, any name)
-- ============================================
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('outlet_petty_cash_transactions', 'outlet_petty_cash_settings')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 3. ONE POLICY PER TABLE FOR ALL COMMANDS
-- ============================================
-- Access is granted when either:
--   * the caller is an active staff account (users row), which covers admin,
--     manager, super_admin and any role added later without naming roles, or
--   * the caller holds an active outlet_users assignment to the outlet.
-- users.is_active is treated as TRUE when NULL so legacy accounts are not
-- locked out; only an explicit FALSE denies access.
CREATE POLICY "petty_cash_transactions_access" ON outlet_petty_cash_transactions
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM users u
         WHERE u.id = auth.uid()
           AND COALESCE(u.is_active, TRUE) IS TRUE
      )
      OR outlet_id IN (
        SELECT ou.outlet_id FROM outlet_users ou
         WHERE ou.user_id = auth.uid()
           AND COALESCE(ou.is_active, TRUE) IS TRUE
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM users u
         WHERE u.id = auth.uid()
           AND COALESCE(u.is_active, TRUE) IS TRUE
      )
      OR outlet_id IN (
        SELECT ou.outlet_id FROM outlet_users ou
         WHERE ou.user_id = auth.uid()
           AND COALESCE(ou.is_active, TRUE) IS TRUE
      )
    )
  );

CREATE POLICY "petty_cash_settings_access" ON outlet_petty_cash_settings
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM users u
         WHERE u.id = auth.uid()
           AND COALESCE(u.is_active, TRUE) IS TRUE
      )
      OR outlet_id IN (
        SELECT ou.outlet_id FROM outlet_users ou
         WHERE ou.user_id = auth.uid()
           AND COALESCE(ou.is_active, TRUE) IS TRUE
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM users u
         WHERE u.id = auth.uid()
           AND COALESCE(u.is_active, TRUE) IS TRUE
      )
      OR outlet_id IN (
        SELECT ou.outlet_id FROM outlet_users ou
         WHERE ou.user_id = auth.uid()
           AND COALESCE(ou.is_active, TRUE) IS TRUE
      )
    )
  );

-- 4. VERIFY AFTER RUNNING
-- ============================================
-- The ledger survived (rows grouped by outlet, signed balance per outlet):
--   SELECT outlet_id,
--          COUNT(*) AS rows,
--          SUM(CASE WHEN txn_type = 'payment' THEN -amount ELSE amount END) AS balance
--     FROM outlet_petty_cash_transactions
--    GROUP BY outlet_id
--    ORDER BY rows DESC;
--
-- Exactly one policy per table should be listed:
--   SELECT tablename, policyname, cmd
--     FROM pg_policies
--    WHERE tablename IN ('outlet_petty_cash_transactions', 'outlet_petty_cash_settings')
--    ORDER BY tablename;

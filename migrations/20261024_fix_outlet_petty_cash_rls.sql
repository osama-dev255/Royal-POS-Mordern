-- ============================================
-- Fix RLS on the Petty Cash Book tables
-- Date: 2026-10-24
-- Description: The original migration (20261022_create_outlet_petty_cash.sql)
--   created permissive "USING (true)" policies on outlet_petty_cash_transactions
--   and outlet_petty_cash_settings, so any authenticated client could read or
--   write another outlet's petty cash ledger by sending its outlet_id.
--   This migration replaces those policies with outlet-scoped authorization:
--   a row is only accessible when the authenticated user is assigned to that
--   outlet (outlet_users) or holds the platform admin role (users.role).
--   Safe to re-run: policies are dropped and recreated.
-- ============================================

-- 1. ENSURE RLS IS ENABLED AND FORCED
-- ============================================
ALTER TABLE outlet_petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_petty_cash_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlet_petty_cash_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE outlet_petty_cash_settings FORCE ROW LEVEL SECURITY;

-- 2. DROP EXISTING POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can view petty cash transactions" ON outlet_petty_cash_transactions;
DROP POLICY IF EXISTS "Users can insert petty cash transactions" ON outlet_petty_cash_transactions;
DROP POLICY IF EXISTS "Users can update petty cash transactions" ON outlet_petty_cash_transactions;
DROP POLICY IF EXISTS "Users can delete petty cash transactions" ON outlet_petty_cash_transactions;
DROP POLICY IF EXISTS "Users can view petty cash settings" ON outlet_petty_cash_settings;
DROP POLICY IF EXISTS "Users can insert petty cash settings" ON outlet_petty_cash_settings;
DROP POLICY IF EXISTS "Users can update petty cash settings" ON outlet_petty_cash_settings;
DROP POLICY IF EXISTS "Users can delete petty cash settings" ON outlet_petty_cash_settings;

-- 3. RECREATE OUTLET-SCOPED POLICIES - TRANSACTIONS
-- ============================================
CREATE POLICY "Users can view petty cash transactions" ON outlet_petty_cash_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert petty cash transactions" ON outlet_petty_cash_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update petty cash transactions" ON outlet_petty_cash_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete petty cash transactions" ON outlet_petty_cash_transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- 4. RECREATE OUTLET-SCOPED POLICIES - SETTINGS
-- ============================================
CREATE POLICY "Users can view petty cash settings" ON outlet_petty_cash_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert petty cash settings" ON outlet_petty_cash_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can update petty cash settings" ON outlet_petty_cash_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can delete petty cash settings" ON outlet_petty_cash_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR outlet_id IN (
      SELECT outlet_id FROM outlet_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- ============================================
-- Migration complete!
-- Run this file in the Supabase SQL Editor so the corrected policies
-- replace the permissive ones already applied to the live database.
-- ============================================

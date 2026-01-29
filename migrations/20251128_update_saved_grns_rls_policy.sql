-- Migration to update RLS policies for saved_grns table to allow full access in development
-- This script should be run in the Supabase SQL editor

-- First, drop the existing policies
DROP POLICY IF EXISTS "Users can view their own saved GRNs" ON saved_grns;
DROP POLICY IF EXISTS "Users can insert their own saved GRNs" ON saved_grns;
DROP POLICY IF EXISTS "Users can update their own saved GRNs" ON saved_grns;
DROP POLICY IF EXISTS "Users can delete their own saved GRNs" ON saved_grns;

-- Create new permissive policies for development/testing
CREATE POLICY "Enable read access for all users" ON saved_grns FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON saved_grns FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON saved_grns FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON saved_grns FOR DELETE USING (true);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
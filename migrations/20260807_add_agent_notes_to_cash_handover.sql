-- Add agent reconciliation note columns to cash_handover_notes
ALTER TABLE cash_handover_notes ADD COLUMN IF NOT EXISTS agent_claim_note TEXT DEFAULT '';
ALTER TABLE cash_handover_notes ADD COLUMN IF NOT EXISTS agent_owed_note TEXT DEFAULT '';

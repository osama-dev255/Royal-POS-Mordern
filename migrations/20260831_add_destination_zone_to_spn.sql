-- Add destination zone fields to supplier_purchase_notes
-- This allows selecting specific zones/blocks within destination godowns
-- destination_details stores a JSON array of {godownName, zoneId, zoneName, quantity} entries

ALTER TABLE supplier_purchase_notes
  ADD COLUMN IF NOT EXISTS destination_zone_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS destination_zone_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS destination_details TEXT DEFAULT '[]';

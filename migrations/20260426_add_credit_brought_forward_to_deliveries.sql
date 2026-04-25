-- Add credit_brought_forward column to saved_delivery_notes table
-- This tracks credit brought forward from previous deliveries for a customer

ALTER TABLE saved_delivery_notes 
ADD COLUMN IF NOT EXISTS credit_brought_forward DECIMAL(15, 2) DEFAULT 0;

-- Create index for faster queries on customers with credit
CREATE INDEX IF NOT EXISTS idx_saved_delivery_notes_credit_brought_forward 
ON saved_delivery_notes(credit_brought_forward) 
WHERE credit_brought_forward > 0;

-- Add comment for clarity
COMMENT ON COLUMN saved_delivery_notes.credit_brought_forward IS 'Credit amount brought forward from previous deliveries for this customer';

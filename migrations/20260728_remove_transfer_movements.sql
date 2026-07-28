-- Remove all outlet-to-outlet transfer movements from the Movement Ledger
-- These are no longer tracked in the Movement Ledger

DELETE FROM stock_movements 
WHERE movement_type IN ('TRANSFER_IN', 'TRANSFER_OUT');

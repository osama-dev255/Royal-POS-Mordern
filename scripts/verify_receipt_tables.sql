-- Verify receipt tables exist and show their structure
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('commission_receipts', 'other_receipts', 'customer_settlements')
ORDER BY table_name;

-- Show column details for each table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('commission_receipts', 'other_receipts', 'customer_settlements')
ORDER BY table_name, ordinal_position;

-- Count records in each table
SELECT 'commission_receipts' as table_name, count(*) as record_count FROM commission_receipts
UNION ALL
SELECT 'other_receipts', count(*) FROM other_receipts
UNION ALL
SELECT 'customer_settlements', count(*) FROM customer_settlements;

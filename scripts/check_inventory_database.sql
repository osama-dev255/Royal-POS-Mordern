-- Comprehensive Database Diagnostic for Outlet Inventory
-- Run this in Supabase SQL Editor

-- ==========================================
-- 1. Check inventory_products table structure
-- ==========================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_generated
FROM information_schema.columns
WHERE table_name = 'inventory_products'
ORDER BY ordinal_position;

-- ==========================================
-- 2. Check if available_quantity is auto-calculated
-- ==========================================
SELECT 
  column_name,
  generation_expression,
  is_identity
FROM information_schema.columns
WHERE table_name = 'inventory_products'
AND column_name IN ('quantity', 'sold_quantity', 'available_quantity');

-- ==========================================
-- 3. Check total records in inventory_products
-- ==========================================
SELECT COUNT(*) as total_inventory_records FROM inventory_products;

-- ==========================================
-- 4. Sample inventory data (first 20 records)
-- ==========================================
SELECT 
  id,
  outlet_id,
  name,
  quantity,
  sold_quantity,
  available_quantity,
  unit_cost,
  selling_price,
  status
FROM inventory_products
ORDER BY created_at DESC
LIMIT 20;

-- ==========================================
-- 5. Check outlets table
-- ==========================================
SELECT 
  id,
  name,
  created_at
FROM outlets
ORDER BY created_at DESC;

-- ==========================================
-- 6. Check saved_delivery_notes table structure
-- ==========================================
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'saved_delivery_notes'
ORDER BY ordinal_position;

-- ==========================================
-- 7. Recent delivery notes
-- ==========================================
SELECT 
  id,
  delivery_note_number,
  customer,
  items,
  total,
  outlet_id,
  created_at
FROM saved_delivery_notes
ORDER BY created_at DESC
LIMIT 10;

-- ==========================================
-- 8. Check outlet_debts table structure
-- ==========================================
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'outlet_debts'
AND column_name IN (
  'amount_paid', 
  'remaining_amount', 
  'debt_payment_amount',
  'shipping_amount',
  'adjustments',
  'adjustment_reason'
)
ORDER BY ordinal_position;

-- ==========================================
-- 9. Check outlet_debt_payments table
-- ==========================================
SELECT COUNT(*) as total_payment_records FROM outlet_debt_payments;

SELECT 
  id,
  debt_id,
  amount,
  payment_method,
  notes,
  created_at
FROM outlet_debt_payments
ORDER BY created_at DESC
LIMIT 10;

-- ==========================================
-- 10. Check inventory by outlet (summary)
-- ==========================================
SELECT 
  o.name as outlet_name,
  COUNT(ip.id) as total_products,
  SUM(ip.quantity) as total_quantity,
  SUM(ip.sold_quantity) as total_sold,
  SUM(ip.available_quantity) as total_available
FROM outlets o
LEFT JOIN inventory_products ip ON o.id = ip.outlet_id
GROUP BY o.id, o.name
ORDER BY o.name;

-- ==========================================
-- 11. Check for products with zero/negative available quantity
-- ==========================================
SELECT 
  outlet_id,
  name,
  quantity,
  sold_quantity,
  available_quantity,
  status
FROM inventory_products
WHERE available_quantity <= 0
ORDER BY available_quantity ASC
LIMIT 20;

-- ==========================================
-- 12. Check RLS policies on inventory_products
-- ==========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'inventory_products';

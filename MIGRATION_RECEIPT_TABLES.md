# Migration Instructions: Receipt Tables

## Migration File
`migrations/20260408_create_receipt_tables.sql`

## What This Migration Does

Creates three new database tables for storing receipt data in Supabase:

1. **`commission_receipts`** - Stores commission payment receipts
2. **`other_receipts`** - Stores miscellaneous/other receipts
3. **`customer_settlements`** - Stores customer debt settlement records

## How to Run the Migration

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire content of `migrations/20260408_create_receipt_tables.sql`
6. Paste it into the SQL editor
7. Click **Run** or press `Ctrl+Enter`
8. You should see: `✅ Receipt tables created successfully`

### Option 2: Using Node.js Script

```bash
node scripts/run-migration.mjs migrations/20260408_create_receipt_tables.sql
```

**Note:** Make sure you have `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file

## Expected Output

After successful migration, you should see these tables in Supabase:

- ✅ `commission_receipts` (with 4 RLS policies)
- ✅ `other_receipts` (with 4 RLS policies)
- ✅ `customer_settlements` (with 4 RLS policies)

## Verification

Run this SQL query in Supabase SQL Editor to verify:

```sql
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('commission_receipts', 'other_receipts', 'customer_settlements')
ORDER BY table_name;
```

Expected result:
```
table_name           | column_count
---------------------+-------------
commission_receipts  | 12
customer_settlements | 13
other_receipts       | 13
```

## What Changes in the App

After running this migration and deploying the code:

### Before (Current State):
- ❌ Commission receipts → localStorage (temporary, device-specific)
- ❌ Other receipts → localStorage (temporary, device-specific)
- ❌ Customer settlements → localStorage (temporary, device-specific)

### After (New State):
- ✅ Commission receipts → Supabase database (persistent, shared)
- ✅ Other receipts → Supabase database (persistent, shared)
- ✅ Customer settlements → Supabase database (persistent, shared)

## Benefits

1. **Persistent Storage** - Data survives browser cache clearing
2. **Multi-Device Access** - Available from any device/browser
3. **Multi-User Access** - All team members can see the same data
4. **Backup & Recovery** - Supabase handles automatic backups
5. **Analytics Ready** - Can be included in sales reports
6. **Scalable** - No localStorage size limits

## Next Steps

1. ✅ Run the migration in Supabase
2. ✅ Deploy the code changes
3. ✅ Test creating receipts in the app
4. ✅ Verify data appears in Supabase tables
5. ⏭️ (Optional) Migrate existing localStorage data to database

## Rollback (If Needed)

If you need to remove these tables:

```sql
DROP TABLE IF EXISTS customer_settlements CASCADE;
DROP TABLE IF EXISTS other_receipts CASCADE;
DROP TABLE IF EXISTS commission_receipts CASCADE;
```

**Warning:** This will delete all receipt data!

## Support

If you encounter any issues:
1. Check Supabase logs for error messages
2. Verify RLS policies are created
3. Check browser console for errors
4. Ensure your user has proper permissions

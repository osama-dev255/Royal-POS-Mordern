# PowerShell script to remove all RLS policies from Supabase database
# This script requires Supabase CLI to be installed and configured

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "Supabase CLI is not installed. Please install it from https://supabase.com/docs/guides/cli"
    exit 1
}

# Check if we're in a Supabase project directory
if (-not (Test-Path "supabase")) {
    Write-Host "This script must be run from the root of a Supabase project directory"
    exit 1
}

# Run the REMOVE_ALL_RLS.sql script
Write-Host "Removing all RLS policies..."
supabase db reset --with-seed
Write-Host "RLS policies removed successfully!"
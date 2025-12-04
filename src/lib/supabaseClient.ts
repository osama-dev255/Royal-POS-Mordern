import { createClient } from '@supabase/supabase-js'

// These will be replaced with your actual Supabase credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

console.log('Supabase URL:', SUPABASE_URL)
console.log('Supabase Anon Key length:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0)

// Validate environment variables
if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('ERROR: VITE_SUPABASE_URL is not set correctly in .env file')
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.error('ERROR: VITE_SUPABASE_ANON_KEY is not set correctly in .env file')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('Supabase client created successfully')
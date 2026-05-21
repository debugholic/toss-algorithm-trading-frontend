import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://anewpjqvgmamrgqxaulr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZXdwanF2Z21hbXJncXhhdWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMzY1MTYsImV4cCI6MjA5NDkxMjUxNn0.Ue-OtoZvT_RUgBtNqhhVH_acLi4bh2zwf5loFJ9x7nk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

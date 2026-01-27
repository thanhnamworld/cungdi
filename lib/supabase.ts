
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ncsbudhkfwppdcmdrxhh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc2J1ZGhrZndwcGRjbWRyeGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMzcwMjksImV4cCI6MjA4MjkxMzAyOX0.83J5XdSi92_lPG2r4PvWmx2SgQ5r4LTH49qsTQCTzyo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

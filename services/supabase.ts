
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zopmrkatcvfcedlzmhpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcG1ya2F0Y3ZmY2VkbHptaHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NjU1MDgsImV4cCI6MjA3MzI0MTUwOH0.T2adp6-XeIgnLsmFD8__0jZW_h5AIr2tTK1kg_o4EDU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://duelbcyslgvpdmjudvmx.supabase.co'; // <<< REPLACE THIS
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZWxiY3lzbGd2cGRtanVkdm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxNzQ3NTIsImV4cCI6MjA3Mzc1MDc1Mn0.l6sn67kJ6vz8w0lyvuf4MdEDGK0suWB2a7csi4PaOqI'; // <<< REPLACE THIS

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  localStorage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
});
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
export const supabase = createClient('https://nfrlygjpqwyufhpsrrlb.supabase.co', 'sb_publishable_-IwEYFGmJKjRu_V6t4aVRQ_JKEDTDv3', {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

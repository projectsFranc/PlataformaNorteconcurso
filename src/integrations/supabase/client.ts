import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gkwphadbveiyjcwiiizw.supabase.co';
const supabaseAnonKey = 'sb_publishable_hF4jXHTs4tapaOMX2KdqvA_N_A5Tyqf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxkjwylavdufoezubvlf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4a2p3eWxhdmR1Zm9lenVidmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTk2MDAwMjMsImV4cCI6MTk3NTE3NjAyM30.UAVMFf6XhGnTCvgDjsTlKqr8q4Ri_UPn0VF0SqfayEU'; //process.env.SUPABASE_KEY

//process.env.REACT_APP_SUPABASE_KEY;
// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey);

supabase
  .from('*')
  .on('*', (payload) => {
    console.log('Change received!', payload);
  })
  .subscribe();

console.log(supabase);
export default supabase;

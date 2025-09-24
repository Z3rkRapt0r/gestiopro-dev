// Script per verificare le variabili d'ambiente nell'applicazione
// Esegui questo nella console del browser (F12)

console.log('=== VERIFICA VARIABILI D\'AMBIENTE ===');

// 1. Verifica le variabili d'ambiente
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);

// 2. Verifica la configurazione Supabase
console.log('=== CONFIGURAZIONE SUPABASE ===');
console.log('URL configurato:', 'https://sccmtqgjcjqezcnvxnep.supabase.co');
console.log('Chiave configurata:', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjY210cWdqY2pxZXpjbnZ4bmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODUxNTEsImV4cCI6MjA3Mzk2MTE1MX0.8epBqzphxxPOEdRXx-sKMYo8XZzIx-XP22rkhHj6SCE');

// 3. Test di connessione Supabase
console.log('=== TEST CONNESSIONE SUPABASE ===');
import { supabase } from '@/integrations/supabase/client';

// Test di connessione
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Errore di connessione:', error);
  } else {
    console.log('Connessione riuscita:', data);
  }
});

// Test di lettura profili
supabase.from('profiles').select('*').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('Errore lettura profili:', error);
  } else {
    console.log('Lettura profili riuscita:', data);
  }
});

console.log('=== FINE VERIFICA ===');



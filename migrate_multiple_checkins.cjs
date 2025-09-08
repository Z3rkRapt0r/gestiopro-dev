const { createClient } = require('@supabase/supabase-js');

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variabili d\'ambiente Supabase non trovate');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMultipleCheckinsTable() {
  try {
    console.log('🚀 Creazione tabella multiple_checkins...');
    
    // SQL per creare la tabella
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.multiple_checkins (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        checkin_time TIME NOT NULL,
        checkout_time TIME,
        is_second_checkin BOOLEAN DEFAULT false,
        permission_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (createError) {
      console.error('❌ Errore nella creazione della tabella:', createError);
      return;
    }

    console.log('✅ Tabella multiple_checkins creata con successo');

    // Crea gli indici
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_multiple_checkins_employee_date 
      ON public.multiple_checkins(employee_id, date);
      
      CREATE INDEX IF NOT EXISTS idx_multiple_checkins_permission 
      ON public.multiple_checkins(permission_id);
    `;

    const { error: indexError } = await supabase.rpc('exec_sql', { sql: createIndexSQL });
    
    if (indexError) {
      console.error('❌ Errore nella creazione degli indici:', indexError);
      return;
    }

    console.log('✅ Indici creati con successo');

    // Abilita RLS
    const enableRLSSQL = `ALTER TABLE public.multiple_checkins ENABLE ROW LEVEL SECURITY;`;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLSSQL });
    
    if (rlsError) {
      console.error('❌ Errore nell\'abilitazione RLS:', rlsError);
      return;
    }

    console.log('✅ RLS abilitato con successo');

    // Crea le policy RLS
    const createPoliciesSQL = `
      -- Policy per gli utenti (possono vedere solo le loro registrazioni)
      CREATE POLICY "Users can view their own checkins" ON public.multiple_checkins
        FOR SELECT USING (auth.uid() = employee_id);

      CREATE POLICY "Users can insert their own checkins" ON public.multiple_checkins
        FOR INSERT WITH CHECK (auth.uid() = employee_id);

      CREATE POLICY "Users can update their own checkins" ON public.multiple_checkins
        FOR UPDATE USING (auth.uid() = employee_id);

      CREATE POLICY "Users can delete their own checkins" ON public.multiple_checkins
        FOR DELETE USING (auth.uid() = employee_id);

      -- Policy per gli admin (possono vedere tutte le registrazioni)
      CREATE POLICY "Admins can view all checkins" ON public.multiple_checkins
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
          )
        );

      CREATE POLICY "Admins can insert all checkins" ON public.multiple_checkins
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
          )
        );

      CREATE POLICY "Admins can update all checkins" ON public.multiple_checkins
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
          )
        );

      CREATE POLICY "Admins can delete all checkins" ON public.multiple_checkins
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
          )
        );
    `;

    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL });
    
    if (policiesError) {
      console.error('❌ Errore nella creazione delle policy:', policiesError);
      return;
    }

    console.log('✅ Policy RLS create con successo');

    // Crea il trigger per updated_at
    const createTriggerSQL = `
      CREATE OR REPLACE FUNCTION public.handle_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER handle_multiple_checkins_updated_at
        BEFORE UPDATE ON public.multiple_checkins
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: createTriggerSQL });
    
    if (triggerError) {
      console.error('❌ Errore nella creazione del trigger:', triggerError);
      return;
    }

    console.log('✅ Trigger creato con successo');
    console.log('🎉 Migrazione completata con successo!');

  } catch (error) {
    console.error('❌ Errore generale:', error);
  }
}

createMultipleCheckinsTable();

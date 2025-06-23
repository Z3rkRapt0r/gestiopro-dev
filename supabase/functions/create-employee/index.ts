
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { firstName, lastName, email, password, role, employeeCode } = await req.json()

    if (!firstName || !lastName || !email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Crea client Supabase con il service role key per operazioni admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Creazione dipendente:', { email, firstName, lastName, role })

    // Verifica duplicati email in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      throw new Error('Esiste già un dipendente con questa email nei profili');
    }

    // Verifica duplicati email in auth.users
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = usersData?.users?.find((user: any) => user.email === email);
    
    if (existingAuthUser) {
      throw new Error('Esiste già un utente con questa email nel sistema di autenticazione');
    }

    // Crea l'utente in Supabase Auth
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role,
      }
    });

    console.log('Risultato creazione utente admin:', { signUpData, signUpError });

    if (signUpError) {
      console.error('Errore nella creazione utente admin:', signUpError);
      throw new Error(signUpError.message || "Errore durante la creazione dell'account");
    }

    const userId = signUpData?.user?.id;
    if (!userId) {
      throw new Error("Impossibile recuperare l'id del nuovo utente.");
    }

    console.log('Utente creato con ID:', userId);

    // Attendi un momento per assicurarsi che l'utente sia salvato
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verifica che l'utente esista in auth.users
    const { data: createdUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (getUserError || !createdUser.user) {
      console.error('Utente non trovato dopo la creazione:', getUserError);
      throw new Error('Utente non trovato dopo la creazione');
    }

    console.log('Utente verificato in auth.users');

    // Ora crea o aggiorna il profilo manualmente
    const { data: existingProfileData } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfileData) {
      // Se il profilo esiste già (creato dal trigger), aggiornalo
      console.log('Profilo esistente trovato, aggiorno i dati');
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: email,
          role: role,
          employee_code: employeeCode || null,
          is_active: true
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Errore aggiornamento profilo:', updateError);
        throw new Error(`Errore nell'aggiornamento del profilo: ${updateError.message}`);
      }
    } else {
      // Se il profilo non esiste, crealo manualmente
      console.log('Creando profilo manualmente...');
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          role: role,
          employee_code: employeeCode || null,
          is_active: true
        });

      if (insertError) {
        console.error('Errore inserimento profilo:', insertError);
        
        // Se l'errore è dovuto alla chiave esterna, elimina l'utente creato
        if (insertError.message.includes('foreign key constraint')) {
          console.log('Eliminando utente creato a causa di errore profilo...');
          await supabaseAdmin.auth.admin.deleteUser(userId);
        }
        
        throw new Error(`Errore nella creazione del profilo: ${insertError.message}`);
      }
    }

    // Crea bilancio ferie iniziale per dipendenti
    if (role === 'employee') {
      const currentYear = new Date().getFullYear();
      const { error: balanceError } = await supabaseAdmin
        .from('employee_leave_balance')
        .insert({
          user_id: userId,
          year: currentYear,
          vacation_days_total: 26,
          permission_hours_total: 32,
          vacation_days_used: 0,
          permission_hours_used: 0
        });

      if (balanceError) {
        console.warn('Errore creazione bilancio ferie:', balanceError);
        // Non blocchiamo la creazione per questo errore
      }
    }

    console.log('Dipendente creato con successo');

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        message: `${firstName} ${lastName} è stato aggiunto con successo al sistema`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Errore nella funzione create-employee:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

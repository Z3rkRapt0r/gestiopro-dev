
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
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
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

    console.log('Eliminazione utente completa per:', userId)

    // Prima elimina tutti i dati dell'utente
    const { error: clearError } = await supabaseAdmin.rpc('clear_user_data', {
      user_uuid: userId
    });

    if (clearError) {
      console.error('Errore eliminazione dati:', clearError)
      throw clearError
    }

    // Elimina il profilo
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Errore eliminazione profilo:', profileError)
      throw profileError
    }

    // Elimina l'utente dall'autenticazione
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Errore eliminazione auth:', authError)
      throw authError
    }

    console.log('Utente eliminato completamente:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Utente eliminato completamente' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Errore nella funzione delete-user-completely:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

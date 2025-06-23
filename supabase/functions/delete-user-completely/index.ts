
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

    console.log('Inizio eliminazione completa utente:', userId)

    // Verifica dati prima della pulizia
    const { data: verifyBefore, error: verifyBeforeError } = await supabaseAdmin.rpc('verify_user_data_exists', {
      user_uuid: userId
    });

    if (verifyBeforeError) {
      console.error('Errore verifica dati iniziale:', verifyBeforeError)
      throw verifyBeforeError
    }

    console.log('Dati utente prima della pulizia:', verifyBefore)

    // Esegue la pulizia completa usando la nuova funzione
    const { data: cleanupResult, error: cleanupError } = await supabaseAdmin.rpc('complete_user_cleanup', {
      user_uuid: userId
    });

    if (cleanupError) {
      console.error('Errore durante la pulizia completa:', cleanupError)
      throw cleanupError
    }

    console.log('Risultato pulizia completa:', cleanupResult)

    // Verifica finale per assicurarsi che non ci siano dati residui
    const { data: verifyAfter, error: verifyAfterError } = await supabaseAdmin.rpc('verify_user_data_exists', {
      user_uuid: userId
    });

    if (verifyAfterError) {
      console.error('Errore verifica dati finale:', verifyAfterError)
      throw verifyAfterError
    }

    console.log('Verifica finale:', verifyAfter)

    // Se ci sono ancora dati residui, tenta una seconda pulizia
    if (verifyAfter?.has_remaining_data) {
      console.log('Trovati dati residui, eseguo seconda pulizia per utente:', userId)
      
      const { data: secondCleanup, error: secondCleanupError } = await supabaseAdmin.rpc('complete_user_cleanup', {
        user_uuid: userId
      });

      if (secondCleanupError) {
        console.error('Errore durante la seconda pulizia:', secondCleanupError)
      } else {
        console.log('Seconda pulizia completata:', secondCleanup)
      }
    }

    // Elimina l'utente dall'autenticazione
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Errore eliminazione auth:', authError)
      throw authError
    }

    console.log('Utente eliminato completamente dalla auth:', userId)

    // Verifica finale finale per confermare la rimozione completa
    const { data: finalVerify, error: finalVerifyError } = await supabaseAdmin.rpc('verify_user_data_exists', {
      user_uuid: userId
    });

    if (finalVerifyError) {
      console.error('Errore verifica finale:', finalVerifyError)
    }

    const response = {
      success: true,
      message: 'Utente eliminato completamente',
      verification: {
        before_cleanup: verifyBefore,
        after_cleanup: verifyAfter,
        final_check: finalVerify,
        cleanup_result: cleanupResult
      },
      completely_removed: !finalVerify?.has_remaining_data
    };

    console.log('Eliminazione completa terminata:', response)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Errore nella funzione delete-user-completely:', error)
    
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

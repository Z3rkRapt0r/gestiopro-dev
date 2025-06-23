
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
    const { userId, userName } = await req.json()

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

    console.log('Avvio pulizia automatica per dipendente:', userId, userName)

    // Prima di eliminare i documenti, ottieni la lista dei file da eliminare dallo storage
    const { data: documentsToDelete, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('file_path')
      .or(`user_id.eq.${userId},uploaded_by.eq.${userId}`)

    if (fetchError) {
      console.error('Errore recupero documenti:', fetchError)
    }

    // Elimina i file dallo storage se esistono
    if (documentsToDelete && documentsToDelete.length > 0) {
      const filePaths = documentsToDelete.map(doc => doc.file_path)
      console.log('Eliminazione file storage:', filePaths)
      
      const { error: storageError } = await supabaseAdmin.storage
        .from('documents')
        .remove(filePaths)

      if (storageError) {
        console.error('Errore eliminazione storage:', storageError)
        // Continua comunque con la pulizia del database
      } else {
        console.log('File storage eliminati con successo')
      }
    }

    // Usa la funzione di pulizia completa esistente
    const { data: cleanupResult, error: cleanupError } = await supabaseAdmin.rpc('complete_user_cleanup', {
      user_uuid: userId
    });

    if (cleanupError) {
      console.error('Errore durante la pulizia:', cleanupError)
      throw cleanupError
    }

    // Elimina anche l'utente dall'autenticazione
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Errore eliminazione auth:', authError)
      // Continua anche se l'eliminazione auth fallisce
    }

    console.log('Pulizia automatica completata per:', userName)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Dipendente ${userName} rimosso completamente dal sistema`,
        cleanup_result: cleanupResult,
        files_deleted: documentsToDelete?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Errore nella funzione auto-cleanup-employee:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

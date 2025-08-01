
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[Delete Document] Starting function')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { documentId, userId } = await req.json()
    
    if (!documentId) {
      console.error('[Delete Document] Document ID is required')
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('[Delete Document] Deleting document:', documentId, 'for user:', userId)

    // Prima ottieni le informazioni del documento
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path, user_id, uploaded_by')
      .eq('id', documentId)
      .single()

    if (fetchError) {
      console.error('[Delete Document] Error fetching document:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Document not found or access denied' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    if (!document) {
      console.error('[Delete Document] Document not found')
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Verifica che l'utente sia amministratore o il proprietario del documento
    if (userId) {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profileError || !userProfile) {
        console.error('[Delete Document] Error fetching user profile:', profileError)
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        )
      }

      // Solo amministratori possono eliminare documenti
      if (userProfile.role !== 'admin') {
        console.error('[Delete Document] User is not admin:', userId)
        return new Response(
          JSON.stringify({ error: 'Only administrators can delete documents' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        )
      }
    }

    console.log('[Delete Document] User authorized, proceeding with deletion')

    // Elimina il file dallo storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('[Delete Document] Storage deletion error:', storageError)
      // Continua comunque con l'eliminazione dal database
    } else {
      console.log('[Delete Document] File deleted from storage successfully')
    }

    // Elimina il record dal database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (dbError) {
      console.error('[Delete Document] Database deletion error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete document from database' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('[Delete Document] Document deleted successfully:', documentId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document deleted successfully',
        documentId: documentId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[Delete Document] Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

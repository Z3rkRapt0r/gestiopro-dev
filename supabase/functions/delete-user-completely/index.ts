
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

    // Elimina tutti i dati dell'utente direttamente
    console.log('Eliminazione documenti...')
    const { error: documentsError } = await supabaseAdmin
      .from('documents')
      .delete()
      .or(`user_id.eq.${userId},uploaded_by.eq.${userId}`)
    
    if (documentsError) {
      console.error('Errore eliminazione documenti:', documentsError)
    }

    console.log('Eliminazione presenze...')
    const { error: attendancesError } = await supabaseAdmin
      .from('attendances')
      .delete()
      .eq('user_id', userId)
    
    if (attendancesError) {
      console.error('Errore eliminazione presenze:', attendancesError)
    }

    console.log('Eliminazione presenze unificate...')
    const { error: unifiedAttendancesError } = await supabaseAdmin
      .from('unified_attendances')
      .delete()
      .eq('user_id', userId)
    
    if (unifiedAttendancesError) {
      console.error('Errore eliminazione presenze unificate:', unifiedAttendancesError)
    }

    console.log('Eliminazione presenze manuali...')
    const { error: manualAttendancesError } = await supabaseAdmin
      .from('manual_attendances')
      .delete()
      .eq('user_id', userId)
    
    if (manualAttendancesError) {
      console.error('Errore eliminazione presenze manuali:', manualAttendancesError)
    }

    console.log('Eliminazione richieste di ferie...')
    const { error: leaveRequestsError } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .eq('user_id', userId)
    
    if (leaveRequestsError) {
      console.error('Errore eliminazione richieste di ferie:', leaveRequestsError)
    }

    console.log('Eliminazione bilanci ferie...')
    const { error: leaveBalanceError } = await supabaseAdmin
      .from('employee_leave_balance')
      .delete()
      .eq('user_id', userId)
    
    if (leaveBalanceError) {
      console.error('Errore eliminazione bilanci ferie:', leaveBalanceError)
    }

    console.log('Eliminazione notifiche...')
    const { error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId)
    
    if (notificationsError) {
      console.error('Errore eliminazione notifiche:', notificationsError)
    }

    console.log('Eliminazione viaggi di lavoro...')
    const { error: businessTripsError } = await supabaseAdmin
      .from('business_trips')
      .delete()
      .eq('user_id', userId)
    
    if (businessTripsError) {
      console.error('Errore eliminazione viaggi di lavoro:', businessTripsError)
    }

    console.log('Eliminazione notifiche inviate...')
    const { error: sentNotificationsError } = await supabaseAdmin
      .from('sent_notifications')
      .delete()
      .eq('recipient_id', userId)
    
    if (sentNotificationsError) {
      console.error('Errore eliminazione notifiche inviate:', sentNotificationsError)
    }

    console.log('Eliminazione messaggi...')
    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
    
    if (messagesError) {
      console.error('Errore eliminazione messaggi:', messagesError)
    }

    console.log('Eliminazione profilo...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Errore eliminazione profilo:', profileError)
    }

    // Elimina l'utente dall'autenticazione
    console.log('Eliminazione utente dall\'autenticazione...')
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Errore eliminazione auth:', authError)
      throw authError
    }

    console.log('Utente eliminato completamente dalla auth:', userId)

    // Verifica finale per confermare la rimozione completa
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
        final_check: finalVerify
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

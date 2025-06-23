
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

    // ELIMINAZIONE SISTEMATICA E FORZATA DI TUTTI I DATI DELL'UTENTE

    // 1. Elimina bilanci ferie PRIMA di tutto (priorità massima)
    console.log('Eliminazione PRIORITARIA bilanci ferie...')
    const { error: leaveBalanceError1, count: deletedBalances1 } = await supabaseAdmin
      .from('employee_leave_balance')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
    
    if (leaveBalanceError1) {
      console.error('Errore eliminazione bilanci ferie (primo tentativo):', leaveBalanceError1)
    } else {
      console.log('Bilanci ferie eliminati (primo tentativo):', deletedBalances1)
    }

    // 2. Secondo tentativo di eliminazione bilanci ferie (doppia sicurezza)
    console.log('Secondo tentativo eliminazione bilanci ferie...')
    const { error: leaveBalanceError2, count: deletedBalances2 } = await supabaseAdmin
      .from('employee_leave_balance')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
    
    if (leaveBalanceError2) {
      console.error('Errore eliminazione bilanci ferie (secondo tentativo):', leaveBalanceError2)
    } else {
      console.log('Bilanci ferie eliminati (secondo tentativo):', deletedBalances2)
    }

    // 3. Elimina documenti (sia come proprietario che come uploader)
    console.log('Eliminazione documenti...')
    const { error: documentsError } = await supabaseAdmin
      .from('documents')
      .delete()
      .or(`user_id.eq.${userId},uploaded_by.eq.${userId}`)
    
    if (documentsError) {
      console.error('Errore eliminazione documenti:', documentsError)
    }

    // 4. Elimina presenze dalla tabella attendances
    console.log('Eliminazione presenze...')
    const { error: attendancesError } = await supabaseAdmin
      .from('attendances')
      .delete()
      .eq('user_id', userId)
    
    if (attendancesError) {
      console.error('Errore eliminazione presenze:', attendancesError)
    }

    // 5. Elimina presenze unificate
    console.log('Eliminazione presenze unificate...')
    const { error: unifiedAttendancesError } = await supabaseAdmin
      .from('unified_attendances')
      .delete()
      .eq('user_id', userId)
    
    if (unifiedAttendancesError) {
      console.error('Errore eliminazione presenze unificate:', unifiedAttendancesError)
    }

    // 6. Elimina presenze manuali
    console.log('Eliminazione presenze manuali...')
    const { error: manualAttendancesError } = await supabaseAdmin
      .from('manual_attendances')
      .delete()
      .eq('user_id', userId)
    
    if (manualAttendancesError) {
      console.error('Errore eliminazione presenze manuali:', manualAttendancesError)
    }

    // 7. Elimina richieste di ferie
    console.log('Eliminazione richieste di ferie...')
    const { error: leaveRequestsError } = await supabaseAdmin
      .from('leave_requests')
      .delete()
      .eq('user_id', userId)
    
    if (leaveRequestsError) {
      console.error('Errore eliminazione richieste di ferie:', leaveRequestsError)
    }

    // 8. Elimina notifiche
    console.log('Eliminazione notifiche...')
    const { error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('user_id', userId)
    
    if (notificationsError) {
      console.error('Errore eliminazione notifiche:', notificationsError)
    }

    // 9. Elimina viaggi di lavoro
    console.log('Eliminazione viaggi di lavoro...')
    const { error: businessTripsError } = await supabaseAdmin
      .from('business_trips')
      .delete()
      .eq('user_id', userId)
    
    if (businessTripsError) {
      console.error('Errore eliminazione viaggi di lavoro:', businessTripsError)
    }

    // 10. Elimina notifiche inviate (come destinatario)
    console.log('Eliminazione notifiche inviate...')
    const { error: sentNotificationsError } = await supabaseAdmin
      .from('sent_notifications')
      .delete()
      .eq('recipient_id', userId)
    
    if (sentNotificationsError) {
      console.error('Errore eliminazione notifiche inviate:', sentNotificationsError)
    }

    // 11. Elimina messaggi (sia come mittente che come destinatario)
    console.log('Eliminazione messaggi...')
    const { error: messagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
    
    if (messagesError) {
      console.error('Errore eliminazione messaggi:', messagesError)
    }

    // 12. Elimina impostazioni dashboard se admin
    console.log('Eliminazione impostazioni dashboard...')
    const { error: dashboardSettingsError } = await supabaseAdmin
      .from('dashboard_settings')
      .delete()
      .eq('admin_id', userId)
    
    if (dashboardSettingsError) {
      console.error('Errore eliminazione impostazioni dashboard:', dashboardSettingsError)
    }

    // 13. Elimina impostazioni login se admin
    console.log('Eliminazione impostazioni login...')
    const { error: loginSettingsError } = await supabaseAdmin
      .from('login_settings')
      .delete()
      .eq('admin_id', userId)
    
    if (loginSettingsError) {
      console.error('Errore eliminazione impostazioni login:', loginSettingsError)
    }

    // 14. Elimina impostazioni admin
    console.log('Eliminazione impostazioni admin...')
    const { error: adminSettingsError } = await supabaseAdmin
      .from('admin_settings')
      .delete()
      .eq('admin_id', userId)
    
    if (adminSettingsError) {
      console.error('Errore eliminazione impostazioni admin:', adminSettingsError)
    }

    // 15. Elimina template email se admin
    console.log('Eliminazione template email...')
    const { error: emailTemplatesError } = await supabaseAdmin
      .from('email_templates')
      .delete()
      .eq('admin_id', userId)
    
    if (emailTemplatesError) {
      console.error('Errore eliminazione template email:', emailTemplatesError)
    }

    // 16. Elimina impostazioni logo dipendenti se admin
    console.log('Eliminazione impostazioni logo dipendenti...')
    const { error: employeeLogoSettingsError } = await supabaseAdmin
      .from('employee_logo_settings')
      .delete()
      .eq('admin_id', userId)
    
    if (employeeLogoSettingsError) {
      console.error('Errore eliminazione impostazioni logo dipendenti:', employeeLogoSettingsError)
    }

    // 17. TERZO tentativo eliminazione bilanci ferie (sicurezza finale)
    console.log('Tentativo FINALE eliminazione bilanci ferie...')
    const { error: leaveBalanceError3, count: deletedBalances3 } = await supabaseAdmin
      .from('employee_leave_balance')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
    
    if (leaveBalanceError3) {
      console.error('Errore eliminazione bilanci ferie (tentativo finale):', leaveBalanceError3)
    } else {
      console.log('Bilanci ferie eliminati (tentativo finale):', deletedBalances3)
    }

    // 18. Elimina il profilo
    console.log('Eliminazione profilo...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Errore eliminazione profilo:', profileError)
    }

    // 19. Elimina l'utente dall'autenticazione (SEMPRE PER ULTIMO)
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
      completely_removed: !finalVerify?.has_remaining_data,
      deleted_from_tables: [
        'employee_leave_balance', // PRIORITARIO!
        'documents',
        'attendances', 
        'unified_attendances',
        'manual_attendances',
        'leave_requests',
        'notifications',
        'business_trips',
        'sent_notifications',
        'messages',
        'dashboard_settings',
        'login_settings', 
        'admin_settings',
        'email_templates',
        'employee_logo_settings',
        'profiles',
        'auth.users'
      ],
      leave_balance_deletion_attempts: {
        first: deletedBalances1,
        second: deletedBalances2,
        final: deletedBalances3
      }
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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttendanceToDelete {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
}

interface SyncRequest {
  attendances: AttendanceToDelete[];
  operation: 'single' | 'bulk';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { attendances, operation }: SyncRequest = await req.json();

    console.log(`🔄 Iniziando sincronizzazione eliminazioni (${operation}):`, attendances.length, 'presenze');

    const deletionResults = [];

    for (const attendance of attendances) {
      console.log(`🔍 Cercando presenza corrispondente per user_id: ${attendance.user_id}, date: ${attendance.date}`);

      // Cerca la presenza corrispondente nella tabella attendances
      const { data: matchingAttendances, error: searchError } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', attendance.user_id)
        .eq('date', attendance.date);

      if (searchError) {
        console.error('❌ Errore nella ricerca:', searchError);
        deletionResults.push({
          unified_attendance_id: attendance.id,
          success: false,
          error: searchError.message,
          action: 'search_failed'
        });
        continue;
      }

      if (!matchingAttendances || matchingAttendances.length === 0) {
        console.log(`ℹ️ Nessuna presenza trovata in attendances per ${attendance.user_id} del ${attendance.date}`);
        deletionResults.push({
          unified_attendance_id: attendance.id,
          success: true,
          action: 'no_match_found',
          message: 'Nessuna presenza corrispondente trovata in attendances'
        });
        continue;
      }

      // Se ci sono più presenze per lo stesso giorno, trova quella più simile
      let bestMatch = matchingAttendances[0];
      
      if (matchingAttendances.length > 1 && attendance.check_in_time) {
        // Confronta i timestamp per trovare la migliore corrispondenza
        for (const match of matchingAttendances) {
          if (match.check_in_time && attendance.check_in_time) {
            const attendanceTime = new Date(attendance.check_in_time).getTime();
            const matchTime = new Date(match.check_in_time).getTime();
            const bestMatchTime = new Date(bestMatch.check_in_time || '').getTime();
            
            if (Math.abs(matchTime - attendanceTime) < Math.abs(bestMatchTime - attendanceTime)) {
              bestMatch = match;
            }
          }
        }
      }

      console.log(`🎯 Eliminando presenza ID: ${bestMatch.id} da attendances`);

      // Elimina la presenza dalla tabella attendances
      const { error: deleteError } = await supabase
        .from('attendances')
        .delete()
        .eq('id', bestMatch.id);

      if (deleteError) {
        console.error('❌ Errore nell\'eliminazione:', deleteError);
        deletionResults.push({
          unified_attendance_id: attendance.id,
          attendance_id: bestMatch.id,
          success: false,
          error: deleteError.message,
          action: 'delete_failed'
        });
      } else {
        console.log(`✅ Presenza eliminata con successo: ${bestMatch.id}`);
        deletionResults.push({
          unified_attendance_id: attendance.id,
          attendance_id: bestMatch.id,
          success: true,
          action: 'deleted',
          message: 'Presenza eliminata da attendances'
        });
      }
    }

    const successCount = deletionResults.filter(r => r.success).length;
    const failureCount = deletionResults.filter(r => !r.success).length;

    console.log(`📊 Sincronizzazione completata: ${successCount} successi, ${failureCount} fallimenti`);

    return new Response(JSON.stringify({
      success: true,
      operation,
      total_processed: attendances.length,
      successful_deletions: successCount,
      failed_deletions: failureCount,
      results: deletionResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Errore nella Edge Function sync-attendance-deletion:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

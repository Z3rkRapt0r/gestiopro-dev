import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Esegui direttamente la query SQL per aggiornare la funzione
    const { data, error } = await supabaseClient
      .from('leave_requests')
      .select('id')
      .limit(1)
      .then(() => {
        // Se arriviamo qui, la connessione funziona
        // Ora eseguiamo la query SQL direttamente
        return supabaseClient.rpc('sql', {
          query: `
          CREATE OR REPLACE FUNCTION public.calculate_leave_usage()
          RETURNS TRIGGER AS $$
          DECLARE
              work_schedule RECORD;
              employee_work_schedule RECORD;
              working_days_count INTEGER := 0;
              loop_date DATE;
              is_holiday BOOLEAN;
              is_working_day BOOLEAN;
              day_name TEXT;
          BEGIN
              -- Get work schedule configuration
              SELECT * INTO work_schedule FROM public.work_schedules LIMIT 1;
              
              -- Se la richiesta è approvata, aggiorna il bilancio
              IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
                  -- Per le ferie (calcola giorni lavorativi escludendo festività e considerando orari personalizzati)
                  IF NEW.type = 'ferie' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
                      -- Calcola i giorni lavorativi escludendo festività e considerando orari personalizzati
                      loop_date := NEW.date_from;
                      working_days_count := 0;
                      
                      WHILE loop_date <= NEW.date_to LOOP
                          -- 1. Controlla se è una festività
                          SELECT EXISTS(
                              SELECT 1 FROM public.company_holidays 
                              WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                              OR (is_recurring = false AND date = loop_date)
                          ) INTO is_holiday;
                          
                          -- 2. Se non è festività, controlla se è un giorno lavorativo
                          IF NOT is_holiday THEN
                              -- Controlla gli orari personalizzati del dipendente
                              SELECT * INTO employee_work_schedule 
                              FROM public.employee_work_schedules 
                              WHERE employee_id = NEW.user_id 
                              LIMIT 1;
                              
                              IF employee_work_schedule IS NOT NULL THEN
                                  -- Usa orari personalizzati del dipendente
                                  day_name := CASE EXTRACT(DOW FROM loop_date)
                                      WHEN 0 THEN 'sunday'
                                      WHEN 1 THEN 'monday'
                                      WHEN 2 THEN 'tuesday'
                                      WHEN 3 THEN 'wednesday'
                                      WHEN 4 THEN 'thursday'
                                      WHEN 5 THEN 'friday'
                                      WHEN 6 THEN 'saturday'
                                  END;
                                  
                                  is_working_day := day_name = ANY(employee_work_schedule.work_days);
                              ELSE
                                  -- Usa orari aziendali generali
                                  is_working_day := CASE EXTRACT(DOW FROM loop_date)
                                      WHEN 0 THEN work_schedule.sunday
                                      WHEN 1 THEN work_schedule.monday
                                      WHEN 2 THEN work_schedule.tuesday
                                      WHEN 3 THEN work_schedule.wednesday
                                      WHEN 4 THEN work_schedule.thursday
                                      WHEN 5 THEN work_schedule.friday
                                      WHEN 6 THEN work_schedule.saturday
                                      ELSE false
                                  END;
                              END IF;
                              
                              -- Se è un giorno lavorativo, incrementa il contatore
                              IF is_working_day THEN
                                  working_days_count := working_days_count + 1;
                              END IF;
                          END IF;
                          
                          loop_date := loop_date + INTERVAL '1 day';
                      END LOOP;
                      
                      UPDATE public.employee_leave_balance 
                      SET vacation_days_used = vacation_days_used + working_days_count,
                          updated_at = now()
                      WHERE user_id = NEW.user_id 
                      AND year = EXTRACT(year FROM NEW.date_from);
                  END IF;
                  
                  -- Per i permessi orari ONLY (removed daily permission logic)
                  IF NEW.type = 'permesso' AND NEW.time_from IS NOT NULL AND NEW.time_to IS NOT NULL THEN
                      UPDATE public.employee_leave_balance 
                      SET permission_hours_used = permission_hours_used + EXTRACT(EPOCH FROM (NEW.time_to - NEW.time_from))/3600,
                          updated_at = now()
                      WHERE user_id = NEW.user_id 
                      AND year = EXTRACT(year FROM NEW.day);
                  END IF;
              END IF;
              
              -- Se la richiesta viene rifiutata o cambiata da approvata, sottrai l'utilizzo
              IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
                  -- Per le ferie
                  IF OLD.type = 'ferie' AND OLD.date_from IS NOT NULL AND OLD.date_to IS NOT NULL THEN
                      -- Ricalcola i giorni lavorativi per la sottrazione (stessa logica)
                      loop_date := OLD.date_from;
                      working_days_count := 0;
                      
                      WHILE loop_date <= OLD.date_to LOOP
                          -- 1. Controlla se è una festività
                          SELECT EXISTS(
                              SELECT 1 FROM public.company_holidays 
                              WHERE (is_recurring = true AND date::text LIKE '%-' || EXTRACT(MONTH FROM loop_date)::text || '-' || EXTRACT(DAY FROM loop_date)::text)
                              OR (is_recurring = false AND date = loop_date)
                          ) INTO is_holiday;
                          
                          -- 2. Se non è festività, controlla se è un giorno lavorativo
                          IF NOT is_holiday THEN
                              -- Controlla gli orari personalizzati del dipendente
                              SELECT * INTO employee_work_schedule 
                              FROM public.employee_work_schedules 
                              WHERE employee_id = OLD.user_id 
                              LIMIT 1;
                              
                              IF employee_work_schedule IS NOT NULL THEN
                                  -- Usa orari personalizzati del dipendente
                                  day_name := CASE EXTRACT(DOW FROM loop_date)
                                      WHEN 0 THEN 'sunday'
                                      WHEN 1 THEN 'monday'
                                      WHEN 2 THEN 'tuesday'
                                      WHEN 3 THEN 'wednesday'
                                      WHEN 4 THEN 'thursday'
                                      WHEN 5 THEN 'friday'
                                      WHEN 6 THEN 'saturday'
                                  END;
                                  
                                  is_working_day := day_name = ANY(employee_work_schedule.work_days);
                              ELSE
                                  -- Usa orari aziendali generali
                                  is_working_day := CASE EXTRACT(DOW FROM loop_date)
                                      WHEN 0 THEN work_schedule.sunday
                                      WHEN 1 THEN work_schedule.monday
                                      WHEN 2 THEN work_schedule.tuesday
                                      WHEN 3 THEN work_schedule.wednesday
                                      WHEN 4 THEN work_schedule.thursday
                                      WHEN 5 THEN work_schedule.friday
                                      WHEN 6 THEN work_schedule.saturday
                                      ELSE false
                                  END;
                              END IF;
                              
                              -- Se è un giorno lavorativo, incrementa il contatore
                              IF is_working_day THEN
                                  working_days_count := working_days_count + 1;
                              END IF;
                          END IF;
                          
                          loop_date := loop_date + INTERVAL '1 day';
                      END LOOP;
                      
                      UPDATE public.employee_leave_balance 
                      SET vacation_days_used = GREATEST(0, vacation_days_used - working_days_count),
                          updated_at = now()
                      WHERE user_id = OLD.user_id 
                      AND year = EXTRACT(year FROM OLD.date_from);
                  END IF;
                  
                  -- Per i permessi orari ONLY (removed daily permission logic)
                  IF OLD.type = 'permesso' AND OLD.time_from IS NOT NULL AND OLD.time_to IS NOT NULL THEN
                      UPDATE public.employee_leave_balance 
                      SET permission_hours_used = GREATEST(0, permission_hours_used - EXTRACT(EPOCH FROM (OLD.time_to - OLD.time_from))/3600),
                          updated_at = now()
                      WHERE user_id = OLD.user_id 
                      AND year = EXTRACT(year FROM OLD.day);
                  END IF;
              END IF;
              
              RETURN COALESCE(NEW, OLD);
          END;
          $$;
          `
        })
      })

    if (error) {
      console.error('Errore nell\'esecuzione della query:', error)
      return new Response(
        JSON.stringify({ error: 'Errore nell\'aggiornamento della funzione', details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Funzione calculate_leave_usage aggiornata con successo per escludere festività e considerare orari personalizzati' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Errore generale:', error)
    return new Response(
      JSON.stringify({ error: 'Errore interno del server', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

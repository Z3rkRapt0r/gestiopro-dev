
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkSchedules } from "@/hooks/useWorkSchedules";
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval } from 'date-fns';

export type LeaveRequest = {
  id: string;
  user_id: string;
  type: "permesso" | "ferie";
  day?: string | null;
  time_from?: string | null;
  time_to?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  }
};

export function useLeaveRequests() {
  const { profile } = useAuth();
  const { workSchedule } = useWorkSchedules();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";
  const queryClient = useQueryClient();

  // Funzione per verificare se un giorno è lavorativo
  const isWorkingDay = (date: Date) => {
    if (!workSchedule) return false;
    
    const dayOfWeek = date.getDay();
    switch (dayOfWeek) {
      case 0: return workSchedule.sunday;
      case 1: return workSchedule.monday;
      case 2: return workSchedule.tuesday;
      case 3: return workSchedule.wednesday;
      case 4: return workSchedule.thursday;
      case 5: return workSchedule.friday;
      case 6: return workSchedule.saturday;
      default: return false;
    }
  };

  // For admin: get all, for employee/user: get own
  const { data, isLoading, error } = useQuery({
    queryKey: ["leave_requests", isAdmin ? "admin" : "user"],
    queryFn: async () => {
      let query = supabase.from("leave_requests").select(`
        *,
        profiles: user_id (first_name, last_name, email)
      `).order("created_at", { ascending: false });

      if (!isAdmin && profile?.id) {
        query = query.eq("user_id", profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtro/trasformo profiles: può essere {error: true} se manca!
      const mapped = (data as any[]).map((item) => ({
        ...item,
        profiles: item.profiles && item.profiles.first_name !== undefined
          ? item.profiles
          : undefined,
      })) as LeaveRequest[];
      return mapped;
    },
    enabled: !!profile,
  });

  // Add new leave request
  const insertMutation = useMutation({
    mutationFn: async (payload: Partial<LeaveRequest>) => {
      // Clean the payload: only send relevant fields!
      const {
        user_id,
        type,
        day,
        time_from,
        time_to,
        date_from,
        date_to,
        note,
        status,
      } = payload;
      // Frontend might pass null/undefined, but SQL expects undefined for missing (not null)
      const cleanPayload = {
        user_id: user_id!,
        type: type!,
        day: day ?? null,
        time_from: time_from ?? null,
        time_to: time_to ?? null,
        date_from: date_from ?? null,
        date_to: date_to ?? null,
        note: note ?? null,
        status: status ?? "pending", // Default to pending
      };
      
      const { error, data } = await supabase
        .from("leave_requests")
        .insert(cleanPayload)
        .select()
        .maybeSingle();
      if (error) throw error;

      // Solo se la richiesta è approvata, creiamo le presenze automatiche
      if (status === "approved") {
        // Se la richiesta è per ferie, creiamo presenze speciali per i giorni lavorativi
        if (type === "ferie" && date_from && date_to && data) {
          const startDate = new Date(date_from);
          const endDate = new Date(date_to);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          // Filtra solo i giorni lavorativi basandosi sulla configurazione
          const workingDays = allDays.filter(day => isWorkingDay(day));

          console.log('Giorni lavorativi per ferie:', workingDays.length, 'su', allDays.length, 'giorni totali');

          // Crea le presenze per tutti i giorni lavorativi delle ferie - MARCATE COME FERIE
          if (workingDays.length > 0) {
            const attendancesToCreate = workingDays.map(day => ({
              user_id: user_id!,
              date: format(day, 'yyyy-MM-dd'),
              check_in_time: workSchedule?.start_time || '08:00',
              check_out_time: workSchedule?.end_time || '17:00',
              is_manual: true,
              is_business_trip: false,
              is_sick_leave: false,
              notes: `Ferie`,
            }));

            const { error: attendanceError } = await supabase
              .from('unified_attendances')
              .upsert(attendancesToCreate, {
                onConflict: 'user_id,date'
              });

            if (attendanceError) {
              console.error('Error creating vacation attendances:', attendanceError);
            }
          }
        }

        // Se la richiesta è per permesso giornaliero, creiamo presenza solo se è un giorno lavorativo
        if (type === "permesso" && day && !time_from && !time_to && data) {
          const permissionDate = new Date(day);
          
          if (isWorkingDay(permissionDate)) {
            console.log('Creando presenza per permesso giornaliero:', day);

            const attendanceToCreate = {
              user_id: user_id!,
              date: day,
              check_in_time: workSchedule?.start_time || '08:00',
              check_out_time: workSchedule?.end_time || '17:00',
              is_manual: true,
              is_business_trip: false,
              notes: `Permesso`,
            };

            const { error: attendanceError } = await supabase
              .from('unified_attendances')
              .upsert([attendanceToCreate], {
                onConflict: 'user_id,date'
              });

            if (attendanceError) {
              console.error('Error creating permission attendance:', attendanceError);
            }
          }
        }
      }

      return data as LeaveRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    },
  });

  // Approve/reject request (admin)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_note
    }: { id: string; status: "approved" | "rejected" | "pending"; admin_note?: string }) => {
      const { error, data } = await supabase
        .from("leave_requests")
        .update({
          status,
          admin_note,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;

      // Se viene approvata, creiamo le presenze automatiche
      if (status === "approved" && data) {
        if (data.type === "ferie" && data.date_from && data.date_to) {
          const startDate = new Date(data.date_from);
          const endDate = new Date(data.date_to);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          const workingDays = allDays.filter(day => isWorkingDay(day));

          if (workingDays.length > 0) {
            const attendancesToCreate = workingDays.map(day => ({
              user_id: data.user_id,
              date: format(day, 'yyyy-MM-dd'),
              check_in_time: workSchedule?.start_time || '08:00',
              check_out_time: workSchedule?.end_time || '17:00',
              is_manual: true,
              is_business_trip: false,
              is_sick_leave: false,
              notes: `Ferie`,
            }));

            await supabase
              .from('unified_attendances')
              .upsert(attendancesToCreate, {
                onConflict: 'user_id,date'
              });
          }
        }

        if (data.type === "permesso" && data.day && !data.time_from && !data.time_to) {
          const permissionDate = new Date(data.day);
          
          if (isWorkingDay(permissionDate)) {
            const attendanceToCreate = {
              user_id: data.user_id,
              date: data.day,
              check_in_time: workSchedule?.start_time || '08:00',
              check_out_time: workSchedule?.end_time || '17:00',
              is_manual: true,
              is_business_trip: false,
              notes: `Permesso`,
            };

            await supabase
              .from('unified_attendances')
              .upsert([attendanceToCreate], {
                onConflict: 'user_id,date'
              });
          }
        }
      }

      return data as LeaveRequest;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave_requests"] }),
  });

  // Nuovo: update richiesta permesso/ferie completo
  const updateRequestMutation = useMutation({
    mutationFn: async (payload: Partial<LeaveRequest> & { id: string }) => {
      const { id, ...fields } = payload;
      // Pulizia payload solo colonne editabili
      const editableFields = {
        day: fields.day ?? null,
        time_from: fields.time_from ?? null,
        time_to: fields.time_to ?? null,
        date_from: fields.date_from ?? null,
        date_to: fields.date_to ?? null,
        note: fields.note ?? null,
        admin_note: fields.admin_note ?? null,
        status: fields.status,
      } as any;
      // Non inviare field vuoti se edit non admin
      Object.keys(editableFields).forEach(key => {
        if (editableFields[key] === undefined) delete editableFields[key];
      });
      const { error, data } = await supabase
        .from("leave_requests")
        .update(editableFields)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as LeaveRequest;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave_requests"] }),
  });

  // Nuovo: delete richiesta (ora disponibile anche per ferie approvate se admin)
  const deleteRequestMutation = useMutation({
    mutationFn: async ({ id, leaveRequest }: { id: string; leaveRequest?: LeaveRequest }) => {
      // Se è una richiesta approvata, rimuovi anche le presenze associate
      if (leaveRequest && leaveRequest.status === 'approved') {
        if (leaveRequest.type === 'ferie' && leaveRequest.date_from && leaveRequest.date_to) {
          const startDate = new Date(leaveRequest.date_from);
          const endDate = new Date(leaveRequest.date_to);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          const workingDays = allDays.filter(day => isWorkingDay(day));
          const datesToDelete = workingDays.map(day => format(day, 'yyyy-MM-dd'));
          
          if (datesToDelete.length > 0) {
            await supabase
              .from('unified_attendances')
              .delete()
              .eq('user_id', leaveRequest.user_id)
              .in('date', datesToDelete)
              .eq('notes', 'Ferie');
          }
        }
        
        if (leaveRequest.type === 'permesso' && leaveRequest.day && !leaveRequest.time_from && !leaveRequest.time_to) {
          await supabase
            .from('unified_attendances')
            .delete()
            .eq('user_id', leaveRequest.user_id)
            .eq('date', leaveRequest.day)
            .eq('notes', 'Permesso');
        }
      }

      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      toast({
        title: "Richiesta eliminata",
        description: "La richiesta di ferie/permesso è stata eliminata con successo",
      });
    },
    onError: (error: any) => {
      console.error('Delete leave request error:', error);
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione della richiesta",
        variant: "destructive",
      });
    },
  });

  return {
    isLoading,
    leaveRequests: data,
    error,
    insertMutation,
    updateStatusMutation,
    updateRequestMutation,
    deleteRequestMutation,
    isWorkingDay, // Esportiamo la funzione per uso nei componenti
  };
}

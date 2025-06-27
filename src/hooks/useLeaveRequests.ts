
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkSchedules } from "@/hooks/useWorkSchedules";
import { useToast } from "@/hooks/use-toast";
import { useLeaveBalanceSync } from "@/hooks/useLeaveBalanceSync";
import { format, eachDayOfInterval } from 'date-fns';
import { generateOperationPath, generateReadableId } from '@/utils/italianPathUtils';

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
  // Nuovi campi per l'organizzazione italiana
  operation_path?: string;
  readable_id?: string;
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
  const { invalidateBalanceQueries } = useLeaveBalanceSync();
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

      // Filtro/trasformo profiles e aggiungo path organizzativo
      const mapped = (data as any[]).map((item) => ({
        ...item,
        profiles: item.profiles && item.profiles.first_name !== undefined
          ? item.profiles
          : undefined,
      })) as LeaveRequest[];
      
      console.log('Richieste ferie caricate con nuova struttura italiana:', mapped.length);
      return mapped;
    },
    enabled: !!profile,
  });

  // Add new leave request with Italian organization
  const insertMutation = useMutation({
    mutationFn: async (payload: Partial<LeaveRequest>) => {
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

      // Genera il path organizzativo italiano
      const requestDate = day ? new Date(day) : (date_from ? new Date(date_from) : new Date());
      const operationType = type === 'ferie' ? 'ferie' : 'permesso';
      const operationPath = await generateOperationPath(operationType, user_id!, requestDate);
      const readableId = generateReadableId(operationType, requestDate, user_id!);

      const cleanPayload = {
        user_id: user_id!,
        type: type!,
        day: day ?? null,
        time_from: time_from ?? null,
        time_to: time_to ?? null,
        date_from: date_from ?? null,
        date_to: date_to ?? null,
        note: note ?? null,
        status: status ?? "pending",
      };
      
      console.log('Creazione richiesta con path italiano:', {
        operationPath,
        readableId,
        type: operationType
      });
      
      const { error, data } = await supabase
        .from("leave_requests")
        .insert(cleanPayload)
        .select()
        .maybeSingle();
      if (error) throw error;

      // Solo se la richiesta è approvata, creiamo le presenze automatiche
      if (status === "approved") {
        if (type === "ferie" && date_from && date_to && data) {
          const startDate = new Date(date_from);
          const endDate = new Date(date_to);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          const workingDays = allDays.filter(day => isWorkingDay(day));

          console.log('Giorni lavorativi per ferie:', workingDays.length, 'su', allDays.length, 'giorni totali');

          if (workingDays.length > 0) {
            const attendancesToCreate = workingDays.map(day => ({
              user_id: user_id!,
              date: format(day, 'yyyy-MM-dd'),
              check_in_time: workSchedule?.start_time || '08:00',
              check_out_time: workSchedule?.end_time || '17:00',
              is_manual: true,
              is_business_trip: false,
              is_sick_leave: false,
              notes: `Ferie - ${readableId}`,
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
              notes: `Permesso - ${readableId}`,
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
      console.log('Richiesta inserita con successo nella struttura italiana, invalidando query...');
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      invalidateBalanceQueries();
    },
  });

  // Approve/reject request (admin) with Italian structure
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      admin_note
    }: { id: string; status: "approved" | "rejected" | "pending"; admin_note?: string }) => {
      console.log(`Aggiornando stato richiesta ${id} a: ${status}`);
      
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

      // Se viene approvata, creiamo le presenze automatiche con ID leggibile
      if (status === "approved" && data) {
        const requestDate = data.day ? new Date(data.day) : (data.date_from ? new Date(data.date_from) : new Date());
        const operationType = data.type === 'ferie' ? 'ferie' : 'permesso';
        const readableId = generateReadableId(operationType, requestDate, data.user_id);

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
              notes: `Ferie - ${readableId}`,
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
              notes: `Permesso - ${readableId}`,
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
    onSuccess: () => {
      console.log('Stato richiesta aggiornato nella struttura italiana, invalidando query...');
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      invalidateBalanceQueries();
    },
  });

  // Update richiesta permesso/ferie completo
  const updateRequestMutation = useMutation({
    mutationFn: async (payload: Partial<LeaveRequest> & { id: string }) => {
      console.log('Aggiornando richiesta con struttura italiana:', payload.id);
      
      const editableFields = {
        day: payload.day ?? null,
        time_from: payload.time_from ?? null,
        time_to: payload.time_to ?? null,
        date_from: payload.date_from ?? null,
        date_to: payload.date_to ?? null,
        note: payload.note ?? null,
        admin_note: payload.admin_note ?? null,
        status: payload.status,
      } as any;
      
      Object.keys(editableFields).forEach(key => {
        if (editableFields[key] === undefined) delete editableFields[key];
      });
      
      const { error, data } = await supabase
        .from("leave_requests")
        .update(editableFields)
        .eq("id", payload.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as LeaveRequest;
    },
    onSuccess: () => {
      console.log('Richiesta aggiornata nella struttura italiana, invalidando query...');
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      invalidateBalanceQueries();
    },
  });

  // Delete richiesta con pulizia presenze associate
  const deleteRequestMutation = useMutation({
    mutationFn: async (payload: string | { id: string; leaveRequest?: LeaveRequest }) => {
      let id: string;
      let leaveRequest: LeaveRequest | undefined;
      
      if (typeof payload === 'string') {
        id = payload;
      } else {
        id = payload.id;
        leaveRequest = payload.leaveRequest;
      }

      console.log('Eliminando richiesta dalla struttura italiana con ID:', id);

      if (leaveRequest && leaveRequest.status === 'approved') {
        console.log('Richiesta approvata trovata, rimuovo presenze associate...');
        
        const requestDate = leaveRequest.day ? new Date(leaveRequest.day) : (leaveRequest.date_from ? new Date(leaveRequest.date_from) : new Date());
        const operationType = leaveRequest.type === 'ferie' ? 'ferie' : 'permesso';
        const readableId = generateReadableId(operationType, requestDate, leaveRequest.user_id);
        
        if (leaveRequest.type === 'ferie' && leaveRequest.date_from && leaveRequest.date_to) {
          const startDate = new Date(leaveRequest.date_from);
          const endDate = new Date(leaveRequest.date_to);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });
          
          const workingDays = allDays.filter(day => isWorkingDay(day));
          const datesToDelete = workingDays.map(day => format(day, 'yyyy-MM-dd'));
          
          if (datesToDelete.length > 0) {
            console.log('Eliminando presenze per ferie con ID:', readableId);
            const { error: attendanceError } = await supabase
              .from('unified_attendances')
              .delete()
              .eq('user_id', leaveRequest.user_id)
              .in('date', datesToDelete)
              .like('notes', `%${readableId}%`);
            
            if (attendanceError) {
              console.error('Errore eliminazione presenze ferie:', attendanceError);
            }
          }
        }
        
        if (leaveRequest.type === 'permesso' && leaveRequest.day && !leaveRequest.time_from && !leaveRequest.time_to) {
          console.log('Eliminando presenza per permesso giornaliero con ID:', readableId);
          const { error: attendanceError } = await supabase
            .from('unified_attendances')
            .delete()
            .eq('user_id', leaveRequest.user_id)
            .eq('date', leaveRequest.day)
            .like('notes', `%${readableId}%`);
          
          if (attendanceError) {
            console.error('Errore eliminazione presenza permesso:', attendanceError);
          }
        }
      }

      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
      
      console.log('Richiesta eliminata dalla struttura italiana con successo');
      return id;
    },
    onSuccess: () => {
      console.log('Eliminazione completata nella struttura italiana, invalidando query...');
      queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
      queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
      invalidateBalanceQueries();
      
      toast({
        title: "Richiesta eliminata",
        description: "La richiesta di ferie/permesso è stata eliminata dalla struttura organizzativa italiana",
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
    isWorkingDay,
  };
}

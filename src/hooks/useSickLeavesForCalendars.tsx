import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval } from 'date-fns';

export interface SickLeaveEntry {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface SickLeaveDay {
  user_id: string;
  date: string; // formato YYYY-MM-DD
  sick_leave_id: string;
  notes: string | null;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useSickLeavesForCalendars = () => {
  const { data: sickLeaves, isLoading, error } = useQuery({
    queryKey: ['sick-leaves-for-calendars'],
    queryFn: async () => {
      console.log('🔍 Fetching sick leaves for calendars...');
      
      const { data, error } = await supabase
        .from('sick_leaves')
        .select(`
          id,
          user_id,
          start_date,
          end_date,
          notes,
          created_at,
          updated_at
        `)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching sick leaves:', error);
        throw error;
      }

      // Fetch profiles separately to avoid relationship conflicts
      const userIds = [...new Set(data?.map(sl => sl.user_id) || [])];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
      }

      // Combine data with profiles
      const sickLeavesWithProfiles = data?.map(sickLeave => ({
        ...sickLeave,
        profiles: profiles?.find(profile => profile.id === sickLeave.user_id) || null
      })) || [];

      console.log('✅ Sick leaves fetched:', sickLeavesWithProfiles.length);
      return sickLeavesWithProfiles as SickLeaveEntry[];
    },
  });

  // Funzione per espandere i periodi di malattia in giorni singoli
  const getSickLeaveDays = (): SickLeaveDay[] => {
    if (!sickLeaves) return [];

    const sickDays: SickLeaveDay[] = [];

    sickLeaves.forEach((sickLeave) => {
      const startDate = new Date(sickLeave.start_date);
      const endDate = new Date(sickLeave.end_date);
      
      // Genera tutti i giorni del periodo
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      
      allDays.forEach((day) => {
        sickDays.push({
          user_id: sickLeave.user_id,
          date: format(day, 'yyyy-MM-dd'),
          sick_leave_id: sickLeave.id,
          notes: sickLeave.notes,
          profiles: sickLeave.profiles,
        });
      });
    });

    console.log('📅 Expanded sick leave days:', sickDays.length);
    return sickDays;
  };

  // Funzione per ottenere i giorni di malattia per una data specifica
  const getSickLeavesForDate = (dateStr: string): SickLeaveDay[] => {
    const sickDays = getSickLeaveDays();
    return sickDays.filter(day => day.date === dateStr);
  };

  // Funzione per verificare se un utente è in malattia in una data specifica
  const isUserSickOnDate = (userId: string, dateStr: string): boolean => {
    const sickDays = getSickLeavesForDate(dateStr);
    return sickDays.some(day => day.user_id === userId);
  };

  // Funzione per ottenere tutti i giorni di malattia per un utente specifico
  const getSickLeavesForUser = (userId: string): SickLeaveDay[] => {
    const sickDays = getSickLeaveDays();
    return sickDays.filter(day => day.user_id === userId);
  };

  // Funzione per ottenere i periodi di malattia che includono una data specifica
  const getSickLeavePeriodsForDate = (dateStr: string): SickLeaveEntry[] => {
    if (!sickLeaves) return [];
    
    return sickLeaves.filter(sickLeave => {
      return dateStr >= sickLeave.start_date && dateStr <= sickLeave.end_date;
    });
  };

  return {
    sickLeaves: sickLeaves || [],
    sickLeaveDays: getSickLeaveDays(),
    isLoading,
    error,
    getSickLeavesForDate,
    isUserSickOnDate,
    getSickLeavesForUser,
    getSickLeavePeriodsForDate,
  };
};
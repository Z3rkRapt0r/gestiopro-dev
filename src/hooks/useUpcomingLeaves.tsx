
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UpcomingLeave {
  id: string;
  user_id: string;
  type: 'ferie' | 'permesso';
  start_date: string;
  end_date: string;
  first_name: string;
  last_name: string;
  email: string;
  note: string | null;
  days_until: number;
}

export const useUpcomingLeaves = (daysAhead: number = 10) => {
  const { profile } = useAuth();

  const { data: upcomingLeaves, isLoading } = useQuery({
    queryKey: ['upcoming-leaves', daysAhead],
    queryFn: async () => {
      console.log('Caricamento ferie imminenti per i prossimi', daysAhead, 'giorni...');
      
      const { data, error } = await supabase
        .rpc('get_upcoming_leaves', { days_ahead: daysAhead });

      if (error) {
        console.error('Errore caricamento ferie imminenti:', error);
        throw error;
      }

      console.log('Ferie imminenti caricate:', data);
      return data as UpcomingLeave[];
    },
    enabled: !!profile && profile.role === 'admin',
  });

  return {
    upcomingLeaves: upcomingLeaves || [],
    isLoading,
  };
};

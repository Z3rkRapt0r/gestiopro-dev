
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface BusinessTrip {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  destination: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useBusinessTrips = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: businessTrips, isLoading } = useQuery({
    queryKey: ['business-trips'],
    queryFn: async () => {
      let query = supabase
        .from('business_trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: tripData, error } = await query;

      if (error) {
        console.error('Error fetching business trips:', error);
        throw error;
      }

      // Se è admin, ottieni anche i profili degli utenti
      if (profile?.role === 'admin' && tripData && tripData.length > 0) {
        const userIds = [...new Set(tripData.map(trip => trip.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combina i dati
        const tripsWithProfiles = tripData.map(trip => ({
          ...trip,
          profiles: profilesData?.find(profile => profile.id === trip.user_id) || null
        }));

        return tripsWithProfiles as BusinessTrip[];
      }

      return tripData as BusinessTrip[];
    },
    enabled: !!user && !!profile,
  });

  const createTrip = useMutation({
    mutationFn: async (tripData: Omit<BusinessTrip, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'approved_by' | 'approved_at' | 'admin_notes'>) => {
      const { data, error } = await supabase
        .from('business_trips')
        .insert({
          user_id: user?.id,
          ...tripData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-trips'] });
      toast({
        title: "Trasferta creata",
        description: "La richiesta di trasferta è stata inviata per approvazione",
      });
    },
    onError: (error: any) => {
      console.error('Create trip error:', error);
      toast({
        title: "Errore",
        description: "Errore nella creazione della trasferta",
        variant: "destructive",
      });
    },
  });

  const updateTripStatus = useMutation({
    mutationFn: async ({ tripId, status, adminNotes }: { tripId: string; status: 'approved' | 'rejected'; adminNotes?: string }) => {
      const { data, error } = await supabase
        .from('business_trips')
        .update({
          status,
          admin_notes: adminNotes,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', tripId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-trips'] });
      toast({
        title: "Trasferta aggiornata",
        description: "Lo stato della trasferta è stato aggiornato",
      });
    },
    onError: (error: any) => {
      console.error('Update trip status error:', error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento della trasferta",
        variant: "destructive",
      });
    },
  });

  return {
    businessTrips,
    isLoading,
    createTrip: createTrip.mutate,
    updateTripStatus: updateTripStatus.mutate,
    isCreating: createTrip.isPending,
    isUpdating: updateTripStatus.isPending,
  };
};

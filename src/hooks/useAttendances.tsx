
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Attendance {
  id: string;
  user_id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  date: string;
  created_at: string;
  updated_at: string;
  is_business_trip: boolean | null;
  business_trip_id: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

// Funzione per calcolare la distanza tra due coordinate in metri usando la formula di Haversine
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Raggio della Terra in metri
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radianti
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // in metri
  return distance;
};

export const useAttendances = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Ottieni le impostazioni dell'admin per il controllo della posizione
  const { data: adminSettings } = useQuery({
    queryKey: ['admin-attendance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('checkout_enabled, company_latitude, company_longitude, attendance_radius_meters')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
  });

  const { data: attendances, isLoading } = useQuery({
    queryKey: ['attendances'],
    queryFn: async () => {
      console.log('Fetching attendances...');
      
      let query = supabase
        .from('attendances')
        .select('*')
        .order('date', { ascending: false });

      // Se non è admin, mostra solo le proprie presenze
      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data: attendanceData, error: attendanceError } = await query;

      if (attendanceError) {
        console.error('Error fetching attendances:', attendanceError);
        toast({
          title: "Errore",
          description: "Errore nel caricamento delle presenze",
          variant: "destructive",
        });
        throw attendanceError;
      }

      console.log('Attendances data:', attendanceData);

      // Se è admin, ottieni anche i profili degli utenti
      if (profile?.role === 'admin' && attendanceData && attendanceData.length > 0) {
        const userIds = [...new Set(attendanceData.map(att => att.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Non bloccare se non riusciamo a prendere i profili
        }

        // Combina i dati
        const attendancesWithProfiles = attendanceData.map(attendance => ({
          ...attendance,
          profiles: profilesData?.find(profile => profile.id === attendance.user_id) || null
        }));

        console.log('Attendances with profiles:', attendancesWithProfiles);
        return attendancesWithProfiles as Attendance[];
      }

      return attendanceData as Attendance[];
    },
    enabled: !!user && !!profile,
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ latitude, longitude, isBusinessTrip = false, businessTripId }: { 
      latitude: number; 
      longitude: number; 
      isBusinessTrip?: boolean;
      businessTripId?: string;
    }) => {
      // Controlla la distanza solo se non è in trasferta e ci sono coordinate aziendali
      if (!isBusinessTrip && adminSettings?.company_latitude && adminSettings?.company_longitude) {
        const distance = calculateDistance(
          latitude, 
          longitude, 
          adminSettings.company_latitude, 
          adminSettings.company_longitude
        );

        const maxDistance = adminSettings.attendance_radius_meters || 500;

        console.log('Controllo distanza:', {
          userLocation: { latitude, longitude },
          companyLocation: { lat: adminSettings.company_latitude, lng: adminSettings.company_longitude },
          distance: Math.round(distance),
          maxDistance
        });

        if (distance > maxDistance) {
          throw new Error(`Devi essere entro ${maxDistance} metri dall'azienda per registrare la presenza. Distanza attuale: ${Math.round(distance)} metri.`);
        }
      }

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendances')
        .upsert({
          user_id: user?.id,
          date: today,
          check_in_time: new Date().toISOString(),
          check_in_latitude: latitude,
          check_in_longitude: longitude,
          is_business_trip: isBusinessTrip,
          business_trip_id: businessTripId,
        }, {
          onConflict: 'user_id,date'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Check-in effettuato",
        description: "Il tuo check-in è stato registrato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Check-in error:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il check-in",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendances')
        .update({
          check_out_time: new Date().toISOString(),
          check_out_latitude: latitude,
          check_out_longitude: longitude,
        })
        .eq('user_id', user?.id)
        .eq('date', today)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      toast({
        title: "Check-out effettuato",
        description: "Il tuo check-out è stato registrato con successo",
      });
    },
    onError: (error: any) => {
      console.error('Check-out error:', error);
      toast({
        title: "Errore",
        description: "Errore durante il check-out",
        variant: "destructive",
      });
    },
  });

  const getTodayAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    return attendances?.find(att => att.date === today && att.user_id === user?.id);
  };

  return {
    attendances,
    isLoading,
    checkIn: checkInMutation.mutate,
    checkOut: checkOutMutation.mutate,
    isCheckingIn: checkInMutation.isPending,
    isCheckingOut: checkOutMutation.isPending,
    getTodayAttendance,
    adminSettings,
  };
};

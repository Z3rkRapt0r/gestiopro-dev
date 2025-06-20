
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
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export const useAttendances = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: attendances, isLoading } = useQuery({
    queryKey: ['attendances'],
    queryFn: async () => {
      let query = supabase
        .from('attendances')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('date', { ascending: false });

      // Se non è admin, mostra solo le proprie presenze
      if (profile?.role !== 'admin') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching attendances:', error);
        toast({
          title: "Errore",
          description: "Errore nel caricamento delle presenze",
          variant: "destructive",
        });
        throw error;
      }

      // Trasforma i dati per adattarli al tipo Attendance
      const transformedData = data?.map(item => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] || null : item.profiles
      })) || [];

      return transformedData as Attendance[];
    },
    enabled: !!user,
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ latitude, longitude }: { latitude: number; longitude: number }) => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendances')
        .upsert({
          user_id: user?.id,
          date: today,
          check_in_time: new Date().toISOString(),
          check_in_latitude: latitude,
          check_in_longitude: longitude,
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
        description: "Errore durante il check-in",
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
  };
};

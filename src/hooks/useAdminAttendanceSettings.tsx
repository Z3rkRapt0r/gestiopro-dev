
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface AdminAttendanceSettings {
  checkout_enabled: boolean;
  company_latitude: number | null;
  company_longitude: number | null;
  attendance_radius_meters: number;
}

export const useAdminAttendanceSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-attendance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('checkout_enabled, company_latitude, company_longitude, attendance_radius_meters')
        .eq('admin_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<AdminAttendanceSettings>) => {
      const { data, error } = await supabase
        .from('admin_settings')
        .upsert({
          admin_id: user?.id,
          ...newSettings,
        }, {
          onConflict: 'admin_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-attendance-settings'] });
      toast({
        title: "Impostazioni salvate",
        description: "Le impostazioni delle presenze sono state aggiornate",
      });
    },
    onError: (error: any) => {
      console.error('Settings update error:', error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento delle impostazioni",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
};

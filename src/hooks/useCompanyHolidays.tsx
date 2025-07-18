
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, isAfter, isBefore } from 'date-fns';
import { toast } from 'sonner';

export interface CompanyHoliday {
  id: string;
  admin_id: string;
  date: string;
  name: string;
  description?: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateHolidayData {
  date: string;
  name: string;
  description?: string;
  is_recurring?: boolean;
}

export const useCompanyHolidays = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch holidays
  const { data: holidays, isLoading, error } = useQuery({
    queryKey: ['company-holidays'],
    queryFn: async () => {
      console.log('🗓️ Caricamento giorni festivi...');
      
      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ Errore caricamento giorni festivi:', error);
        throw error;
      }

      console.log('✅ Giorni festivi caricati:', data?.length || 0);
      return data as CompanyHoliday[];
    },
  });

  // Create holiday
  const createHoliday = useMutation({
    mutationFn: async (holidayData: CreateHolidayData) => {
      console.log('➕ Creazione giorno festivo:', holidayData);
      
      if (!profile?.id) {
        throw new Error('Admin non autenticato');
      }

      const { data, error } = await supabase
        .from('company_holidays')
        .insert({
          admin_id: profile.id,
          date: holidayData.date,
          name: holidayData.name,
          description: holidayData.description,
          is_recurring: holidayData.is_recurring || false,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Errore creazione giorno festivo:', error);
        throw error;
      }

      console.log('✅ Giorno festivo creato:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-holidays'] });
      toast.success(`Giorno festivo "${data.name}" aggiunto con successo`);
    },
    onError: (error: any) => {
      console.error('❌ Errore creazione giorno festivo:', error);
      toast.error(error.message || 'Errore durante la creazione del giorno festivo');
    },
  });

  // Update holiday
  const updateHoliday = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateHolidayData> }) => {
      console.log('✏️ Aggiornamento giorno festivo:', { id, updates });
      
      const { data, error } = await supabase
        .from('company_holidays')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Errore aggiornamento giorno festivo:', error);
        throw error;
      }

      console.log('✅ Giorno festivo aggiornato:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-holidays'] });
      toast.success(`Giorno festivo "${data.name}" aggiornato con successo`);
    },
    onError: (error: any) => {
      console.error('❌ Errore aggiornamento giorno festivo:', error);
      toast.error(error.message || 'Errore durante l\'aggiornamento del giorno festivo');
    },
  });

  // Delete holiday
  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Eliminazione giorno festivo:', id);
      
      const { error } = await supabase
        .from('company_holidays')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Errore eliminazione giorno festivo:', error);
        throw error;
      }

      console.log('✅ Giorno festivo eliminato');
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-holidays'] });
      toast.success('Giorno festivo eliminato con successo');
    },
    onError: (error: any) => {
      console.error('❌ Errore eliminazione giorno festivo:', error);
      toast.error(error.message || 'Errore durante l\'eliminazione del giorno festivo');
    },
  });

  // Utility functions
  const isHoliday = (date: Date): boolean => {
    if (!holidays) return false;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.some(holiday => holiday.date === dateStr);
  };

  const getHoliday = (date: Date): CompanyHoliday | undefined => {
    if (!holidays) return undefined;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.find(holiday => holiday.date === dateStr);
  };

  const getHolidaysInRange = (startDate: Date, endDate: Date): CompanyHoliday[] => {
    if (!holidays) return [];
    
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return !isBefore(holidayDate, startDate) && !isAfter(holidayDate, endDate);
    });
  };

  const getUpcomingHolidays = (limit: number = 5): CompanyHoliday[] => {
    if (!holidays) return [];
    
    const today = new Date();
    return holidays
      .filter(holiday => isAfter(new Date(holiday.date), today))
      .slice(0, limit);
  };

  return {
    holidays: holidays || [],
    isLoading,
    error,
    createHoliday: createHoliday.mutate,
    updateHoliday: updateHoliday.mutate,
    deleteHoliday: deleteHoliday.mutate,
    isCreating: createHoliday.isPending,
    isUpdating: updateHoliday.isPending,
    isDeleting: deleteHoliday.isPending,
    // Utility functions
    isHoliday,
    getHoliday,
    getHolidaysInRange,
    getUpcomingHolidays,
  };
};

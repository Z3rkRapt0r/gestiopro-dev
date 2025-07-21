
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CompanyHoliday {
  id: string;
  name: string;
  date: string;
  description?: string;
  is_recurring: boolean;
  admin_id: string;
  created_at: string;
  updated_at: string;
}

interface HolidayForm {
  name: string;
  date: string;
  description?: string;
  is_recurring: boolean;
}

export const useCompanyHolidays = () => {
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchHolidays = async () => {
    if (!user) return;

    setIsLoading(true);
    console.log('🏢 [HOLIDAYS] Inizio caricamento festività...');
    
    try {
      const { data, error } = await (supabase as any)
        .from('company_holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ [HOLIDAYS] Errore nel caricamento festività:', error);
        return;
      }

      console.log('📅 [HOLIDAYS] Festività caricate:', data?.length || 0, 'trovate');
      console.log('📋 [HOLIDAYS] Dettaglio festività:', data);
      
      setHolidays((data as any[]) || []);
    } catch (error) {
      console.error('❌ [HOLIDAYS] Errore nel caricamento festività:', error);
    } finally {
      setIsLoading(false);
      console.log('✅ [HOLIDAYS] Caricamento festività completato');
    }
  };

  const createHoliday = async (holidayData: HolidayForm) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { data, error } = await (supabase as any)
      .from('company_holidays')
      .insert({
        ...holidayData,
        admin_id: user.id
      })
      .select()
      .single();

    if (error) throw error;

    setHolidays(prev => [...prev, data as CompanyHoliday]);
    return data;
  };

  const updateHoliday = async (id: string, holidayData: Partial<HolidayForm>) => {
    const { data, error } = await (supabase as any)
      .from('company_holidays')
      .update(holidayData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setHolidays(prev => prev.map(holiday => 
      holiday.id === id ? { ...holiday, ...data as CompanyHoliday } : holiday
    ));
    return data;
  };

  const deleteHoliday = async (id: string) => {
    const { error } = await (supabase as any)
      .from('company_holidays')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setHolidays(prev => prev.filter(holiday => holiday.id !== id));
  };

  const isHoliday = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const monthDay = date.toISOString().substr(5, 5); // MM-DD format
    
    console.log(`🔍 [HOLIDAYS] Controllo se ${dateStr} è festività...`);
    
    const isHolidayResult = holidays.some(holiday => {
      if (holiday.is_recurring) {
        // Per festività ricorrenti, confronta solo mese e giorno
        const holidayMonthDay = holiday.date.substr(5, 5);
        const match = holidayMonthDay === monthDay;
        if (match) {
          console.log(`🎉 [HOLIDAYS] FESTIVITÀ RICORRENTE trovata: ${holiday.name} per ${dateStr}`);
        }
        return match;
      } else {
        // Per festività specifiche, confronta la data completa
        const match = holiday.date === dateStr;
        if (match) {
          console.log(`🎉 [HOLIDAYS] FESTIVITÀ SPECIFICA trovata: ${holiday.name} per ${dateStr}`);
        }
        return match;
      }
    });
    
    console.log(`${isHolidayResult ? '🚫' : '✅'} [HOLIDAYS] ${dateStr} ${isHolidayResult ? 'È' : 'NON È'} una festività`);
    return isHolidayResult;
  };

  const getHolidaysInRange = (startDate: Date, endDate: Date): CompanyHoliday[] => {
    console.log(`🔍 [HOLIDAYS] Ricerca festività nel range ${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`);
    
    const result = holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      
      if (holiday.is_recurring) {
        // Per festività ricorrenti, controlla se cade nel range per ogni anno
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        
        for (let year = startYear; year <= endYear; year++) {
          const recurringDate = new Date(holiday.date);
          recurringDate.setFullYear(year);
          
          if (recurringDate >= startDate && recurringDate <= endDate) {
            return true;
          }
        }
        return false;
      } else {
        // Per festività specifiche
        return holidayDate >= startDate && holidayDate <= endDate;
      }
    });
    
    console.log(`📅 [HOLIDAYS] Trovate ${result.length} festività nel range`);
    return result;
  };

  const getHolidayName = (date: Date): string | null => {
    const dateStr = date.toISOString().split('T')[0];
    const monthDay = date.toISOString().substr(5, 5);
    
    const holiday = holidays.find(holiday => {
      if (holiday.is_recurring) {
        const holidayMonthDay = holiday.date.substr(5, 5);
        return holidayMonthDay === monthDay;
      } else {
        return holiday.date === dateStr;
      }
    });
    
    if (holiday) {
      console.log(`🏷️ [HOLIDAYS] Nome festività per ${dateStr}: ${holiday.name}`);
    }
    
    return holiday ? holiday.name : null;
  };

  useEffect(() => {
    fetchHolidays();
  }, [user]);

  return {
    holidays,
    isLoading,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    isHoliday,
    getHolidaysInRange,
    getHolidayName,
    refetch: fetchHolidays
  };
};

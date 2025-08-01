import { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
    try {
      const { data, error } = await (supabase as any)
        .from('company_holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching holidays:', error);
        return;
      }

      console.log('🎉 Festività caricate dal database:', (data as any[]) || []);
      console.log('🔍 Numero festività caricate:', (data as any[])?.length || 0);
      if ((data as any[])?.length === 0) {
        console.log('⚠️ ATTENZIONE: Nessuna festività trovata nel database!');
      }
      setHolidays((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    } finally {
      setIsLoading(false);
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
    // Usa format per evitare problemi di fuso orario
    const dateStr = format(date, 'yyyy-MM-dd');
    const monthDay = format(date, 'MM-dd'); // MM-DD format
    
    console.log('🔍 DEBUG: isHoliday chiamata per:', dateStr);
    console.log('🔍 DEBUG: Holidays disponibili:', holidays.length);
    
    const isHolidayResult = holidays.some(holiday => {
      if (holiday.is_recurring) {
        // Per festività ricorrenti, confronta solo mese e giorno
        const holidayMonthDay = holiday.date.substr(5, 5);
        const match = holidayMonthDay === monthDay;
        console.log(`🔍 DEBUG: Festività ricorrente ${holiday.name} (${holiday.date}) - ${holidayMonthDay} vs ${monthDay} = ${match}`);
        return match;
      } else {
        // Per festività specifiche, confronta la data completa
        const match = holiday.date === dateStr;
        console.log(`🔍 DEBUG: Festività specifica ${holiday.name} (${holiday.date}) vs ${dateStr} = ${match}`);
        return match;
      }
    });
    
    console.log('🔍 DEBUG: Risultato finale isHoliday per', dateStr, ':', isHolidayResult);
    
    return isHolidayResult;
  };

  const getHolidaysInRange = (startDate: Date, endDate: Date): CompanyHoliday[] => {
    return holidays.filter(holiday => {
      if (holiday.is_recurring) {
        // Per festività ricorrenti, controlla se cade nel range per ogni anno
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        
        for (let year = startYear; year <= endYear; year++) {
          // Crea una data ricorrente usando il mese e giorno della festività
          const [month, day] = holiday.date.substr(5, 5).split('-').map(Number);
          const recurringDate = new Date(year, month - 1, day); // month - 1 perché i mesi in JS sono 0-based
          
          if (recurringDate >= startDate && recurringDate <= endDate) {
            return true;
          }
        }
        return false;
      } else {
        // Per festività specifiche, usa la data come stringa per evitare problemi di fuso orario
        const holidayDate = new Date(holiday.date + 'T00:00:00');
        return holidayDate >= startDate && holidayDate <= endDate;
      }
    });
  };

  const getHolidayName = (date: Date): string | null => {
    // Usa format per evitare problemi di fuso orario
    const dateStr = format(date, 'yyyy-MM-dd');
    const monthDay = format(date, 'MM-dd');
    
    const holiday = holidays.find(holiday => {
      if (holiday.is_recurring) {
        const holidayMonthDay = holiday.date.substr(5, 5);
        return holidayMonthDay === monthDay;
      } else {
        return holiday.date === dateStr;
      }
    });
    
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
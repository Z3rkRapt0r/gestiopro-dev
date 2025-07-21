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
    try {
      const { data, error } = await (supabase as any)
        .from('company_holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching holidays:', error);
        return;
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
    const dateStr = date.toISOString().split('T')[0];
    const monthDay = date.toISOString().substr(5, 5); // MM-DD format
    
    return holidays.some(holiday => {
      if (holiday.is_recurring) {
        // Per festività ricorrenti, confronta solo mese e giorno
        const holidayMonthDay = holiday.date.substr(5, 5);
        return holidayMonthDay === monthDay;
      } else {
        // Per festività specifiche, confronta la data completa
        return holiday.date === dateStr;
      }
    });
  };

  const getHolidaysInRange = (startDate: Date, endDate: Date): CompanyHoliday[] => {
    return holidays.filter(holiday => {
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
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
      console.log('🎄 Caricamento festività aziendali...');
      const { data, error } = await (supabase as any)
        .from('company_holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ Errore caricamento festività:', error);
        return;
      }

      console.log('🎄 Festività caricate:', data?.length || 0, 'elementi');
      console.log('🎄 Lista festività:', data);
      setHolidays((data as any[]) || []);
    } catch (error) {
      console.error('❌ Errore nel fetch festività:', error);
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
    if (!date || holidays.length === 0) {
      return false;
    }

    // Normalizza la data per confronto (rimuovi timezone issues)
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dateStr = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthDay = dateStr.substr(5, 5); // MM-DD
    
    console.log('🔍 Controllo se è festività:', {
      originalDate: date,
      normalizedDate: checkDate,
      dateStr,
      monthDay,
      holidaysCount: holidays.length
    });
    
    const found = holidays.some(holiday => {
      const holidayDateStr = holiday.date; // Già in formato YYYY-MM-DD dal DB
      
      if (holiday.is_recurring) {
        // Per festività ricorrenti, confronta solo mese e giorno (MM-DD)
        const holidayMonthDay = holidayDateStr.substr(5, 5);
        const isMatch = holidayMonthDay === monthDay;
        
        if (isMatch) {
          console.log('🎄 FESTIVITÀ RICORRENTE TROVATA:', {
            holidayName: holiday.name,
            holidayMonthDay,
            checkMonthDay: monthDay
          });
        }
        
        return isMatch;
      } else {
        // Per festività specifiche, confronta la data completa
        const isMatch = holidayDateStr === dateStr;
        
        if (isMatch) {
          console.log('🎄 FESTIVITÀ SPECIFICA TROVATA:', {
            holidayName: holiday.name,
            holidayDate: holidayDateStr,
            checkDate: dateStr
          });
        }
        
        return isMatch;
      }
    });

    console.log('🎄 Risultato controllo festività:', found ? 'È FESTIVITÀ' : 'Non è festività');
    return found;
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

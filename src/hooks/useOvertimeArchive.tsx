import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface OvertimeRecord {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
}

interface OvertimesByEmployee {
  [employeeId: string]: {
    employee_name: string;
    years: {
      [year: string]: {
        [month: string]: OvertimeRecord[];
      };
    };
  };
}

export const useOvertimeArchive = () => {
  const [overtimes, setOvertimes] = useState<OvertimeRecord[]>([]);
  const [overtimesByEmployee, setOvertimesByEmployee] = useState<OvertimesByEmployee>({});
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchOvertimes = async () => {
    if (!profile?.id) return;

    console.log('Fetching overtime records...');
    setLoading(true);
    
    try {
      let query = supabase
        .from('overtime_records')
        .select(`
          *,
          profiles!overtime_records_user_id_fkey(first_name, last_name)
        `)
        .order('date', { ascending: false });

      if (profile.role !== 'admin') {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching overtime records:', error);
        toast({
          title: "Errore",
          description: "Errore nel caricamento degli straordinari",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched overtime records:', data?.length || 0);
      
      const overtimeRecords: OvertimeRecord[] = (data || []).map((record: any) => ({
        ...record,
        first_name: record.profiles?.first_name,
        last_name: record.profiles?.last_name,
      }));

      setOvertimes(overtimeRecords);
      groupOvertimesByEmployee(overtimeRecords);
    } catch (error) {
      console.error('Error in fetchOvertimes:', error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento degli straordinari",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupOvertimesByEmployee = (records: OvertimeRecord[]) => {
    const grouped: OvertimesByEmployee = {};

    records.forEach(record => {
      const employeeId = record.user_id;
      const employeeName = record.first_name && record.last_name 
        ? `${record.first_name} ${record.last_name}` 
        : 'Dipendente sconosciuto';
      
      const date = new Date(record.date);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString('it-IT', { month: 'long' });

      if (!grouped[employeeId]) {
        grouped[employeeId] = {
          employee_name: employeeName,
          years: {}
        };
      }

      if (!grouped[employeeId].years[year]) {
        grouped[employeeId].years[year] = {};
      }

      if (!grouped[employeeId].years[year][month]) {
        grouped[employeeId].years[year][month] = [];
      }

      grouped[employeeId].years[year][month].push(record);
    });

    setOvertimesByEmployee(grouped);
  };

  const deleteOvertimeRecord = async (id: string) => {
    if (profile?.role !== 'admin') {
      toast({
        title: "Errore",
        description: "Non hai i permessi per eliminare straordinari",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('overtime_records')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting overtime record:', error);
        toast({
          title: "Errore",
          description: "Errore nell'eliminazione dello straordinario",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Successo",
        description: "Straordinario eliminato con successo",
      });

      await fetchOvertimes();
      return true;
    } catch (error) {
      console.error('Error in deleteOvertimeRecord:', error);
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione dello straordinario",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteOvertimesByPeriod = async (employeeId: string, year?: string, month?: string) => {
    if (profile?.role !== 'admin') {
      toast({
        title: "Errore",
        description: "Non hai i permessi per eliminare straordinari",
        variant: "destructive",
      });
      return false;
    }

    try {
      let query = supabase
        .from('overtime_records')
        .delete()
        .eq('user_id', employeeId);

      if (year) {
        const startDate = new Date(parseInt(year), month ? new Date(`${month} 1, ${year}`).getMonth() : 0, 1);
        const endDate = month 
          ? new Date(parseInt(year), new Date(`${month} 1, ${year}`).getMonth() + 1, 0)
          : new Date(parseInt(year), 11, 31);

        query = query
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);
      }

      const { error } = await query;

      if (error) {
        console.error('Error deleting overtime records by period:', error);
        toast({
          title: "Errore",
          description: "Errore nell'eliminazione degli straordinari",
          variant: "destructive",
        });
        return false;
      }

      const periodText = month ? `${month} ${year}` : year ? year : 'tutti gli straordinari';
      toast({
        title: "Successo",
        description: `Straordinari eliminati per ${periodText}`,
      });

      await fetchOvertimes();
      return true;
    } catch (error) {
      console.error('Error in deleteOvertimesByPeriod:', error);
      toast({
        title: "Errore",
        description: "Errore nell'eliminazione degli straordinari",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchOvertimes();
    }
  }, [profile?.id]);

  return {
    overtimes,
    overtimesByEmployee,
    loading,
    fetchOvertimes,
    deleteOvertimeRecord,
    deleteOvertimesByPeriod,
  };
};
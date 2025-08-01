
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDocuments: number;
  pendingLeaveRequests: number;
  totalAttendancesToday: number;
  unreadNotifications: number;
  averageDailyAttendance: number;
  todayAttendances: number;
  recentNotifications: any[];
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalDocuments: 0,
    pendingLeaveRequests: 0,
    totalAttendancesToday: 0,
    unreadNotifications: 0,
    averageDailyAttendance: 0,
    todayAttendances: 0,
    recentNotifications: [],
  });
  const [loading, setLoading] = useState(false);
  const fetchInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchStats = async () => {
    // Evita fetch multipli simultanei
    if (fetchInProgressRef.current || !mountedRef.current) return;
    
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Esegui tutte le query in parallelo per velocizzare il caricamento
      const [
        { count: totalEmployees },
        { count: activeEmployees },
        { count: totalDocuments },
        { count: pendingLeaveRequests },
        { count: totalAttendancesToday },
        { count: unreadNotifications },
        recentNotificationsData
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('date', today),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('notifications').select('title, message, created_at').order('created_at', { ascending: false }).limit(5)
      ]);

      // Calculate average daily attendance (simplified calculation)
      const averageDailyAttendance = activeEmployees && totalAttendancesToday 
        ? Math.round((totalAttendancesToday / activeEmployees) * 100) 
        : 0;

      if (mountedRef.current) {
        setStats({
          totalEmployees: totalEmployees || 0,
          activeEmployees: activeEmployees || 0,
          totalDocuments: totalDocuments || 0,
          pendingLeaveRequests: pendingLeaveRequests || 0,
          totalAttendancesToday: totalAttendancesToday || 0,
          unreadNotifications: unreadNotifications || 0,
          averageDailyAttendance,
          todayAttendances: totalAttendancesToday || 0,
          recentNotifications: recentNotificationsData.data || [],
        });
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchInProgressRef.current = false;
    }
  };

  // Gestisce la visibilità della pagina con debounce migliorato
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        console.log('[useAdminStats] Page became visible, scheduling refresh...');
        // Debounce più lungo per evitare chiamate eccessive
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          if (mountedRef.current) {
            fetchStats();
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, []);

  useEffect(() => {
    fetchStats();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { stats, loading, refreshStats: fetchStats };
};

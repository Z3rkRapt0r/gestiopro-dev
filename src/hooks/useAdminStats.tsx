
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDocuments: number;
  pendingLeaveRequests: number;
  totalAttendancesToday: number;
  unreadNotifications: number;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalDocuments: 0,
    pendingLeaveRequests: 0,
    totalAttendancesToday: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchStats = async () => {
    // Evita fetch multipli simultanei
    if (loading) return;
    
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Esegui tutte le query in parallelo per velocizzare il caricamento
      const [
        { count: totalEmployees },
        { count: activeEmployees },
        { count: totalDocuments },
        { count: pendingLeaveRequests },
        { count: totalAttendancesToday },
        { count: unreadNotifications }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('date', today),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false)
      ]);

      setStats({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        totalDocuments: totalDocuments || 0,
        pendingLeaveRequests: pendingLeaveRequests || 0,
        totalAttendancesToday: totalAttendancesToday || 0,
        unreadNotifications: unreadNotifications || 0,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gestisce la visibilità della pagina
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useAdminStats] Page became visible, refreshing stats...');
        // Ritarda leggermente per evitare richieste eccessive
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(fetchStats, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refreshStats: fetchStats };
};


import { useState, useEffect } from 'react';
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

  const fetchStats = async () => {
    setLoading(true);
    try {
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
        supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0]),
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

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refreshStats: fetchStats };
};

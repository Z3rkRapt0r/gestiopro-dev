
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EmployeeStats {
  documentsCount: number;
  unreadNotificationsCount: number;
  leaveRequestsCount: number;
  pendingLeaveRequests: number;
  approvedLeaveRequests: number;
  rejectedLeaveRequests: number;
  recentDocuments: any[];
  recentNotifications: any[];
}

export const useEmployeeStats = () => {
  const [stats, setStats] = useState<EmployeeStats>({
    documentsCount: 0,
    unreadNotificationsCount: 0,
    leaveRequestsCount: 0,
    pendingLeaveRequests: 0,
    approvedLeaveRequests: 0,
    rejectedLeaveRequests: 0,
    recentDocuments: [],
    recentNotifications: [],
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Conteggio documenti
      const { count: documentsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Conteggio notifiche non lette
      const { count: unreadNotificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      // Conteggio richieste ferie
      const { count: leaveRequestsCount } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Richieste ferie per stato
      const { data: leaveRequests } = await supabase
        .from('leave_requests')
        .select('status')
        .eq('user_id', user.id);

      const pendingLeaveRequests = leaveRequests?.filter(req => req.status === 'pending').length || 0;
      const approvedLeaveRequests = leaveRequests?.filter(req => req.status === 'approved').length || 0;
      const rejectedLeaveRequests = leaveRequests?.filter(req => req.status === 'rejected').length || 0;

      // Documenti recenti (ultimi 5)
      const { data: recentDocuments } = await supabase
        .from('documents')
        .select('id, title, created_at, document_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Notifiche recenti (ultime 5)
      const { data: recentNotifications } = await supabase
        .from('notifications')
        .select('id, title, created_at, is_read, type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        documentsCount: documentsCount || 0,
        unreadNotificationsCount: unreadNotificationsCount || 0,
        leaveRequestsCount: leaveRequestsCount || 0,
        pendingLeaveRequests,
        approvedLeaveRequests,
        rejectedLeaveRequests,
        recentDocuments: recentDocuments || [],
        recentNotifications: recentNotifications || [],
      });
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();

      // Setup real-time subscriptions
      const documentsChannel = supabase
        .channel('employee-documents-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `user_id=eq.${user.id}`
          },
          () => fetchStats()
        )
        .subscribe();

      const notificationsChannel = supabase
        .channel('employee-notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => fetchStats()
        )
        .subscribe();

      const leaveRequestsChannel = supabase
        .channel('employee-leave-requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leave_requests',
            filter: `user_id=eq.${user.id}`
          },
          () => fetchStats()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(documentsChannel);
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(leaveRequestsChannel);
      };
    }
  }, [user]);

  return { stats, loading, refreshStats: fetchStats };
};

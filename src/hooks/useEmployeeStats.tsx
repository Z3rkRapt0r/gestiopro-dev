
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
  vacationDaysRemaining: number;
  permissionHoursRemaining: number;
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
    vacationDaysRemaining: 0,
    permissionHoursRemaining: 0,
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

      // Bilancio ferie e permessi per l'anno corrente
      const currentYear = new Date().getFullYear();
      const { data: leaveBalance } = await supabase
        .from('employee_leave_balance')
        .select('vacation_days_total, vacation_days_used, permission_hours_total, permission_hours_used')
        .eq('user_id', user.id)
        .eq('year', currentYear)
        .maybeSingle();

      const vacationDaysRemaining = leaveBalance 
        ? Math.max(0, leaveBalance.vacation_days_total - leaveBalance.vacation_days_used)
        : 0;
      
      const permissionHoursRemaining = leaveBalance 
        ? Math.max(0, leaveBalance.permission_hours_total - leaveBalance.permission_hours_used)
        : 0;

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
        vacationDaysRemaining,
        permissionHoursRemaining,
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

      const leaveBalanceChannel = supabase
        .channel('employee-leave-balance-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'employee_leave_balance',
            filter: `user_id=eq.${user.id}`
          },
          () => fetchStats()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(documentsChannel);
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(leaveRequestsChannel);
        supabase.removeChannel(leaveBalanceChannel);
      };
    }
  }, [user]);

  return { stats, loading, refreshStats: fetchStats };
};

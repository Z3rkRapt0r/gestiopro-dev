
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
      // Ottimizzazione: esegui le query più leggere prima
      const basicQueries = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      ]);

      const [documentsResult, notificationsResult, leaveRequestsResult] = basicQueries;

      // Query più complesse
      const [leaveRequestsData, leaveBalanceData, recentDocuments, recentNotifications] = await Promise.all([
        supabase.from('leave_requests').select('status').eq('user_id', user.id),
        supabase.from('employee_leave_balance').select('vacation_days_total, vacation_days_used, permission_hours_total, permission_hours_used').eq('user_id', user.id).eq('year', new Date().getFullYear()).maybeSingle(),
        supabase.from('documents').select('id, title, created_at, document_type').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('notifications').select('id, title, created_at, is_read, type').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      ]);

      const pendingLeaveRequests = leaveRequestsData.data?.filter(req => req.status === 'pending').length || 0;
      const approvedLeaveRequests = leaveRequestsData.data?.filter(req => req.status === 'approved').length || 0;
      const rejectedLeaveRequests = leaveRequestsData.data?.filter(req => req.status === 'rejected').length || 0;

      const vacationDaysRemaining = leaveBalanceData.data 
        ? Math.max(0, leaveBalanceData.data.vacation_days_total - leaveBalanceData.data.vacation_days_used)
        : 0;
      
      const permissionHoursRemaining = leaveBalanceData.data 
        ? Math.max(0, leaveBalanceData.data.permission_hours_total - leaveBalanceData.data.permission_hours_used)
        : 0;

      setStats({
        documentsCount: documentsResult.count || 0,
        unreadNotificationsCount: notificationsResult.count || 0,
        leaveRequestsCount: leaveRequestsResult.count || 0,
        pendingLeaveRequests,
        approvedLeaveRequests,
        rejectedLeaveRequests,
        vacationDaysRemaining,
        permissionHoursRemaining,
        recentDocuments: recentDocuments.data || [],
        recentNotifications: recentNotifications.data || [],
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


import { useState, useEffect, useRef } from 'react';
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
  const subscriptionsRef = useRef<any[]>([]);
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchStats = async () => {
    if (!user || loading) return;

    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      
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
        supabase.from('employee_leave_balance').select('vacation_days_total, vacation_days_used, permission_hours_total, permission_hours_used').eq('user_id', user.id).eq('year', currentYear).maybeSingle(),
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

  // Gestisce la visibilità della pagina
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('[useEmployeeStats] Page became visible, refreshing stats...');
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(fetchStats, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();

      // Setup real-time subscriptions con cleanup migliorato
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
          () => {
            console.log('[useEmployeeStats] Documents changed, refreshing...');
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = setTimeout(fetchStats, 200);
          }
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
          () => {
            console.log('[useEmployeeStats] Notifications changed, refreshing...');
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = setTimeout(fetchStats, 200);
          }
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
          () => {
            console.log('[useEmployeeStats] Leave requests changed, refreshing...');
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = setTimeout(fetchStats, 200);
          }
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
          () => {
            console.log('[useEmployeeStats] Leave balance changed, refreshing...');
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = setTimeout(fetchStats, 200);
          }
        )
        .subscribe();

      // Salva i canali per cleanup
      subscriptionsRef.current = [documentsChannel, notificationsChannel, leaveRequestsChannel, leaveBalanceChannel];

      return () => {
        subscriptionsRef.current.forEach(channel => {
          supabase.removeChannel(channel);
        });
        subscriptionsRef.current = [];
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      };
    }
  }, [user]);

  return { stats, loading, refreshStats: fetchStats };
};

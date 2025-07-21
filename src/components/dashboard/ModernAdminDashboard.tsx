
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

// Import existing sections
import AdminDashboardOverview from './AdminDashboardOverview';
import AdminEmployeesSection from './AdminEmployeesSection';
import AdminAttendanceSection from './AdminAttendanceSection';
import AdminDocumentsSection from './AdminDocumentsSection';
import NotificationsSection from './NotificationsSection';
import AdminSettingsSection from '../admin/AdminSettingsSection';
import AdminLeaveApprovalsSection from '../leave/AdminLeaveApprovalsSection';
import AdminOvertimeSection from '../overtime/AdminOvertimeSection';

// Import new modern components
import ModernAdminSidebar from './ModernAdminSidebar';
import ModernAdminHeader from './ModernAdminHeader';

const tabTitles = {
  dashboard: 'Dashboard',
  employees: 'Gestione Dipendenti',
  attendance: 'Gestione Presenze',
  overtime: 'Gestione Straordinari',
  leaves: 'Gestione Permessi',
  documents: 'Gestione Documenti',
  notifications: 'Centro Notifiche',
  settings: 'Impostazioni Sistema'
};

export default function ModernAdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const queryClient = useQueryClient();

  // Invalidate queries when changing tabs
  useEffect(() => {
    console.log('Cambio sezione admin, invalidando tutte le query...');
    queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance-stats'] });
    queryClient.invalidateQueries({ queryKey: ['leave_balance_validation'] });
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
  }, [activeTab, queryClient]);

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Verificando autorizzazioni...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardOverview />;
      case 'employees':
        return <AdminEmployeesSection />;
      case 'attendance':
        return <AdminAttendanceSection />;
      case 'overtime':
        return <AdminOvertimeSection />;
      case 'leaves':
        return <AdminLeaveApprovalsSection />;
      case 'documents':
        return <AdminDocumentsSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'settings':
        return <AdminSettingsSection />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <ModernAdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <ModernAdminHeader
            title={tabTitles[activeTab as keyof typeof tabTitles]}
          />

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50/50 to-white pb-20 lg:pb-6">
            <div className="container mx-auto px-4 lg:px-6 py-6">
              <div className="animate-fade-in">
                {renderContent()}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  Bell, 
  Settings,
  Calendar,
  Building
} from 'lucide-react';

// Import existing sections
import AdminDashboardOverview from './AdminDashboardOverview';
import AdminEmployeesSection from './AdminEmployeesSection';
import AdminAttendanceSection from './AdminAttendanceSection';
import AdminDocumentsSection from './AdminDocumentsSection';
import NotificationsSection from './NotificationsSection';
import AdminHolidaysSection from '../admin/AdminHolidaysSection';
import AdminSettingsSection from '../admin/AdminSettingsSection';
import AdminLeaveApprovalsSection from '../leave/AdminLeaveApprovalsSection';
import AdminOvertimeSection from '../overtime/AdminOvertimeSection';

// Import new modern components
import ModernAdminSidebar from './ModernAdminSidebar';
import ModernAdminHeader from './ModernAdminHeader';
import AppFooter from '../ui/AppFooter';

const tabTitles = {
  dashboard: 'Dashboard',
  employees: 'Gestione Dipendenti',
  attendance: 'Gestione Presenze',
  overtime: 'Gestione Straordinari',
  leaves: 'Gestione Permessi',
  documents: 'Gestione Documenti',
  notifications: 'Centro Notifiche',
  holidays: 'Gestione Festività',
  settings: 'Impostazioni Sistema'
};

const tabIcons = {
  dashboard: LayoutDashboard,
  employees: Users,
  attendance: Clock,
  overtime: Clock,
  leaves: Calendar,
  documents: FileText,
  notifications: Bell,
  holidays: Calendar,
  settings: Settings
};

export default function ModernAdminDashboard() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  // Gestione parametri URL per la sezione
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['dashboard', 'employees', 'attendance', 'overtime', 'leaves', 'documents', 'notifications', 'holidays', 'settings'].includes(section)) {
      setActiveTab(section);
    }
  }, [searchParams]);

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

  // Listen for tab change events from other components
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail);
      // Close mobile menu when navigating
      setIsMobileMenuOpen(false);
    };

    window.addEventListener('setAdminTab', handleTabChange as EventListener);
    
    return () => {
      window.removeEventListener('setAdminTab', handleTabChange as EventListener);
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMobileMenuOpen && !target.closest('.mobile-menu') && !target.closest('.mobile-menu-toggle')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

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
      case 'holidays':
        return <AdminHolidaysSection />;
      case 'settings':
        return <AdminSettingsSection />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <ModernAdminSidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header with Hamburger */}
          <div className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-sm z-40">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="mobile-menu-toggle p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-4 w-4 text-slate-700" />
                  ) : (
                    <Menu className="h-4 w-4 text-slate-700" />
                  )}
                </button>
                <div>
                  <h1 className="font-bold text-slate-900 text-base">
                    {tabTitles[activeTab as keyof typeof tabTitles]}
                  </h1>
                  <p className="text-xs text-slate-500">Area Amministratore</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block">
            <ModernAdminHeader
              title={tabTitles[activeTab as keyof typeof tabTitles]}
            />
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 bg-black/50 z-50">
              <div className="mobile-menu absolute top-0 left-0 w-72 h-full bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-900 text-lg">Menu</h2>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <X className="h-4 w-4 text-slate-700" />
                    </button>
                  </div>
                </div>
                
                <nav className="p-3 space-y-1">
                  {Object.entries(tabTitles).map(([key, title]) => {
                    const isActive = activeTab === key;
                    const Icon = tabIcons[key as keyof typeof tabIcons];
                    return (
                      <button
                        key={key}
                        onClick={() => handleTabChange(key)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 shadow-md'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-1.5 rounded-md ${
                            isActive
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-sm">{title}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50/50 to-white pb-20 lg:pb-6">
            <div className="container mx-auto px-4 lg:px-6 py-6">
              <div className="animate-fade-in">
                {renderContent()}
              </div>
            </div>
            <AppFooter />
          </main>
        </div>
      </div>
    </div>
  );
}

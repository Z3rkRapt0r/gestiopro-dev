
import { useState } from 'react';
import { BarChart3, Calendar, Clock, FileText, Settings, Users, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import EmployeeDashboardSection from './EmployeeDashboardSection';
import AdminApprovalsSection from '@/components/leave/AdminApprovalsSection';
import AdminDocumentsSection from './AdminDocumentsSection';
import AdminNotificationsSection from './AdminNotificationsSection';
import AdminSettingsSection from '@/components/admin/AdminSettingsSection';
import AdminEmployeesSection from './AdminEmployeesSection';
import DashboardHeader from './DashboardHeader';
import AdminAttendanceSection from './AdminAttendanceSection';
import AdminDashboardOverview from './AdminDashboardOverview';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<'overview' | 'employees' | 'leaves' | 'attendances' | 'documents' | 'notifications' | 'settings'>('overview');
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-64 bg-slate-200 rounded-lg"></div>
          <div className="h-6 w-48 bg-slate-200 rounded"></div>
          <div className="h-6 w-36 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Accesso Negato</h2>
          <p className="text-red-600">Utente non autorizzato</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      title: 'Panoramica',
      icon: BarChart3,
      key: 'overview' as const,
      description: 'Dashboard generale'
    },
    {
      title: 'Dipendenti',
      icon: Users,
      key: 'employees' as const,
      description: 'Gestione personale'
    },
    {
      title: 'Permessi & Ferie',
      icon: Calendar,
      key: 'leaves' as const,
      description: 'Richieste e approvazioni'
    },
    {
      title: 'Presenze',
      icon: Clock,
      key: 'attendances' as const,
      description: 'Monitoraggio orari'
    },
    {
      title: 'Documenti',
      icon: FileText,
      key: 'documents' as const,
      description: 'Gestione file'
    },
    {
      title: 'Notifiche',
      icon: Bell,
      key: 'notifications' as const,
      description: 'Comunicazioni'
    },
    {
      title: 'Impostazioni',
      icon: Settings,
      key: 'settings' as const,
      description: 'Configurazione sistema'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminDashboardOverview />;
      case 'employees':
        return <AdminEmployeesSection />;
      case 'leaves':
        return <AdminApprovalsSection />;
      case 'attendances':
        return <AdminAttendanceSection />;
      case 'documents':
        return <AdminDocumentsSection />;
      case 'notifications':
        return <AdminNotificationsSection />;
      case 'settings':
        return <AdminSettingsSection />;
      default:
        return <AdminDashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <Sidebar className="border-r border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-lg">
            <SidebarContent className="p-0">
              <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-xl">Admin Panel</h2>
                    <p className="text-sm text-slate-600">Dashboard di controllo</p>
                  </div>
                </div>
              </div>
              
              <SidebarGroup className="px-4 py-6">
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-4">
                  Navigazione
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-2">
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.key)}
                          isActive={activeSection === item.key}
                          className={`
                            group relative w-full transition-all duration-300 rounded-xl p-3 h-auto
                            ${activeSection === item.key 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                              : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 hover:scale-102'
                            }
                          `}
                        >
                          <item.icon className={`
                            w-5 h-5 transition-all duration-300
                            ${activeSection === item.key ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}
                          `} />
                          <div className="flex flex-col items-start">
                            <span className="font-semibold text-sm">{item.title}</span>
                            <span className={`
                              text-xs transition-colors duration-300
                              ${activeSection === item.key ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-500'}
                            `}>
                              {item.description}
                            </span>
                          </div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex-1">
            <div className="flex flex-col min-h-screen">
              <div className="sticky top-0 z-40">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/60">
                  <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg p-2 transition-all duration-200" />
                  <div className="flex-1">
                    <DashboardHeader 
                      title="Dashboard Amministratore" 
                      subtitle="Gestisci dipendenti e operazioni" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-6 bg-gradient-to-br from-slate-50/50 to-white">
                <div className="animate-fade-in">
                  {renderContent()}
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}

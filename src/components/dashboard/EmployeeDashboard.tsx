
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import EmployeeDashboardContent from './EmployeeDashboardContent';
import EmployeeDashboardHeader from './EmployeeDashboardHeader';
import EmployeeLeavePage from '@/components/leave/EmployeeLeavePage';
import DocumentsSection from './DocumentsSection';
import EmployeeMessagesSection from './EmployeeMessagesSection';
import EmployeeAttendanceSection from './EmployeeAttendanceSection';
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
import { BarChart3, Calendar, Clock, FileText, MessageSquare, User } from 'lucide-react';

export default function EmployeeDashboard() {
  const [activeSection, setActiveSection] = useState<'overview' | 'leaves' | 'attendances' | 'documents' | 'messages'>('overview');
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Aggiorna i dati quando si cambia sezione
  useEffect(() => {
    console.log('Cambio sezione dipendente, invalidando tutte le query dei bilanci e presenze...');
    // Invalida le query principali per aggiornare i dati in tempo reale
    queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance'] });
    queryClient.invalidateQueries({ queryKey: ['employee-leave-balance-stats'] });
    queryClient.invalidateQueries({ queryKey: ['leave_balance_validation'] });
    queryClient.invalidateQueries({ queryKey: ['unified-attendances'] });
    queryClient.invalidateQueries({ queryKey: ['attendances'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
  }, [activeSection, queryClient]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-8 sm:h-12 bg-slate-200 rounded-lg"></div>
          <div className="h-4 sm:h-6 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 sm:h-6 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      title: 'Panoramica',
      icon: BarChart3,
      key: 'overview' as const,
      description: 'Dashboard personale'
    },
    {
      title: 'Permessi & Ferie',
      icon: Calendar,
      key: 'leaves' as const,
      description: 'Le tue richieste'
    },
    {
      title: 'Presenze',
      icon: Clock,
      key: 'attendances' as const,
      description: 'Orari e check-in'
    },
    {
      title: 'Documenti',
      icon: FileText,
      key: 'documents' as const,
      description: 'I tuoi file'
    },
    {
      title: 'Messaggi',
      icon: MessageSquare,
      key: 'messages' as const,
      description: 'Comunicazioni'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <EmployeeDashboardContent activeSection="dashboard" />;
      case 'leaves':
        return <EmployeeLeavePage />;
      case 'attendances':
        return <EmployeeAttendanceSection />;
      case 'documents':
        return <DocumentsSection />;
      case 'messages':
        return <EmployeeMessagesSection />;
      default:
        return <EmployeeDashboardContent activeSection="dashboard" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <SidebarProvider defaultOpen={false}>
        <div className="flex w-full min-h-screen">
          <Sidebar className="border-r border-slate-200/60 bg-white/95 backdrop-blur-sm shadow-lg">
            <SidebarContent className="p-0">
              <div className="p-4 sm:p-6 border-b border-slate-200/60 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <User className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-900 text-lg sm:text-xl truncate">Area Dipendente</h2>
                    <p className="text-xs sm:text-sm text-slate-600 truncate">Dashboard personale</p>
                  </div>
                </div>
              </div>
              
              <SidebarGroup className="px-3 sm:px-4 py-4 sm:py-6">
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 sm:px-3 mb-3 sm:mb-4">
                  Navigazione
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1 sm:space-y-2">
                    {menuItems.map((item) => (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.key)}
                          isActive={activeSection === item.key}
                          className={`
                            group relative w-full transition-all duration-300 rounded-lg sm:rounded-xl p-2 sm:p-3 h-auto min-h-[44px]
                            ${activeSection === item.key 
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-[1.02]' 
                              : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 hover:scale-[1.01] active:scale-[0.98]'
                            }
                          `}
                        >
                          <item.icon className={`
                            w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 flex-shrink-0
                            ${activeSection === item.key ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}
                          `} />
                          <div className="flex flex-col items-start min-w-0 flex-1 ml-2 sm:ml-3">
                            <span className="font-semibold text-xs sm:text-sm truncate w-full">{item.title}</span>
                            <span className={`
                              text-xs transition-colors duration-300 truncate w-full
                              ${activeSection === item.key ? 'text-green-100' : 'text-slate-400 group-hover:text-slate-500'}
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
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/60">
                  <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg p-2 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center" />
                  <div className="flex-1 min-w-0">
                    <EmployeeDashboardHeader />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-slate-50/50 to-white">
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

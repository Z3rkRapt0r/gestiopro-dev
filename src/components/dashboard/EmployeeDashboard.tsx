
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
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

  if (!profile) {
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
      <SidebarProvider>
        <div className="flex w-full min-h-screen">
          <Sidebar className="border-r border-slate-200/60 bg-white/90 backdrop-blur-sm shadow-lg">
            <SidebarContent className="p-0">
              <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-xl">Area Dipendente</h2>
                    <p className="text-sm text-slate-600">Dashboard personale</p>
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
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105' 
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
                <div className="flex items-center gap-2 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/60">
                  <SidebarTrigger className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg p-2 transition-all duration-200" />
                  <div className="flex-1">
                    <EmployeeDashboardHeader />
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

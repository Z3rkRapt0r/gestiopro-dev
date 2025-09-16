
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  Bell, 
  Settings,
  Calendar,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardSettings } from '@/hooks/useDashboardSettings';
import { supabase } from '@/integrations/supabase/client';

interface ModernAdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  {
    id: 'employees',
    label: 'Dipendenti',
    icon: Users,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700'
  },
  {
    id: 'attendance',
    label: 'Presenze',
    icon: Clock,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700'
  },
  {
    id: 'overtime',
    label: 'Straordinari',
    icon: Clock,
    color: 'from-orange-500 to-amber-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700'
  },
  {
    id: 'leaves',
    label: 'Permessi',
    icon: Calendar,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700'
  },
  {
    id: 'documents',
    label: 'Documenti',
    icon: FileText,
    color: 'from-indigo-500 to-blue-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700'
  },
  {
    id: 'notifications',
    label: 'Notifiche',
    icon: Bell,
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700'
  },
  {
    id: 'holidays',
    label: 'Festività',
    icon: Calendar,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700'
  }
];

export default function ModernAdminSidebar({ 
  activeTab, 
  setActiveTab
}: ModernAdminSidebarProps) {
  const { settings, loading } = useDashboardSettings();
  const [licenseGlobalLogoUrl, setLicenseGlobalLogoUrl] = useState<string | null>(null);

  // Carica il logo License Global dal bucket company-logos
  useEffect(() => {
    const loadLicenseGlobalLogo = async () => {
      try {
        // Prova diversi percorsi possibili per il logo License Global
        const possiblePaths = [
          'LicenseGlobal/logo.png',
          'licenseglobal/logo.png',
          'License Global/logo.png',
          'logo-license-global/logo.png',
          'LicenseGlobal/logo.jpg',
          'licenseglobal/logo.jpg',
          'License Global/logo.jpg'
        ];
        
        for (const path of possiblePaths) {
          const { data: { publicUrl } } = supabase.storage
            .from('company-logos')
            .getPublicUrl(path);
          
          if (publicUrl) {
            // Verifica se l'URL è accessibile
            try {
              const response = await fetch(publicUrl, { method: 'HEAD' });
              if (response.ok) {
                setLicenseGlobalLogoUrl(publicUrl);
                break;
              }
            } catch (error) {
              console.log(`Logo non accessibile da ${path}:`, error);
              continue;
            }
          }
        }
      } catch (error) {
        console.error('Errore nel caricamento del logo License Global:', error);
      }
    };

    loadLicenseGlobalLogo();
  }, []);

  return (
    <div className="hidden lg:flex flex-col w-72 bg-white/90 backdrop-blur-xl border-r border-slate-200/60 shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center space-x-3">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt="Logo"
              className="h-10 w-auto object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Building className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <h2 className="font-bold text-slate-900 text-lg">
              {settings.company_name || "Dashboard"}
            </h2>
            <p className="text-xs text-slate-500">Area Amministratore</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full group relative transition-all duration-200 rounded-xl",
                isActive
                  ? `${item.bgColor} ${item.textColor} shadow-lg scale-105`
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center space-x-3 p-3 rounded-xl transition-all duration-200">
                <div className={cn(
                  "relative p-2 rounded-lg transition-all duration-200",
                  isActive
                    ? `bg-gradient-to-r ${item.color} shadow-lg`
                    : "bg-slate-100 group-hover:bg-slate-200"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-colors duration-200",
                    isActive ? "text-white" : "text-slate-600 group-hover:text-slate-700"
                  )} />
                </div>
                
                <div className="flex-1 text-left">
                  <span className="font-semibold text-sm">{item.label}</span>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    `bg-gradient-to-r ${item.color}`
                  )} />
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer con logo License Global */}
      <div className="p-4 border-t border-slate-200/60 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center justify-center space-x-2">
          {licenseGlobalLogoUrl ? (
            <img
              src={licenseGlobalLogoUrl}
              alt="License Global"
              className="h-8 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity duration-200"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center">
              <Building className="h-4 w-4 text-white" />
            </div>
          )}
          <span className="text-xs text-slate-500 font-medium">
            License Global
          </span>
        </div>
      </div>
    </div>
  );
}

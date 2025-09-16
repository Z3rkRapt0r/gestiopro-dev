import { useState, useEffect } from "react";
import { BarChart3, Calendar, Clock, FileText, MessageSquare, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EmployeeDashboardSidebarProps {
  activeSection: 'overview' | 'leaves' | 'attendances' | 'documents' | 'messages';
  setActiveSection: (section: 'overview' | 'leaves' | 'attendances' | 'documents' | 'messages') => void;
}

export default function EmployeeDashboardSidebar({ activeSection, setActiveSection }: EmployeeDashboardSidebarProps) {
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
    <div className="w-64 bg-white shadow-sm border-r min-h-screen flex flex-col">
      <div className="p-6 flex-1">
        <nav className="space-y-2">
          <button
            onClick={() => setActiveSection('overview')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'overview'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5" />
              Panoramica
            </div>
          </button>

          <button
            onClick={() => setActiveSection('leaves')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'leaves'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" />
              Permessi & Ferie
            </div>
          </button>

          <button
            onClick={() => setActiveSection('attendances')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'attendances'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              Presenze
            </div>
          </button>

          <button
            onClick={() => setActiveSection('documents')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'documents'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              Documenti
            </div>
          </button>

          <button
            onClick={() => setActiveSection('messages')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'messages'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5" />
              Messaggi
            </div>
          </button>
        </nav>
      </div>

      {/* Footer con logo License Global */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center">
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
        </div>
      </div>
    </div>
  );
}

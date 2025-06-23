
import { BarChart3, Users, FileText, Clock, Bell, Settings } from "lucide-react";

interface AdminDashboardSidebarProps {
  activeSection: 'overview' | 'employees' | 'documents' | 'attendance' | 'notifications' | 'settings';
  setActiveSection: (section: 'overview' | 'employees' | 'documents' | 'attendance' | 'notifications' | 'settings') => void;
}

export default function AdminDashboardSidebar({ activeSection, setActiveSection }: AdminDashboardSidebarProps) {
  return (
    <div className="w-64 bg-white shadow-sm border-r min-h-screen">
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800">Dashboard Admin</h2>
          <p className="text-sm text-gray-600">Gestione aziendale</p>
        </div>
        
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
            onClick={() => setActiveSection('employees')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'employees'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              Dipendenti
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
            onClick={() => setActiveSection('attendance')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'attendance'
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
            onClick={() => setActiveSection('notifications')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'notifications'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              Notifiche
            </div>
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'settings'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" />
              Impostazioni
            </div>
          </button>
        </nav>
      </div>
    </div>
  );
}

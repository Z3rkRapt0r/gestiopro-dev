import { useState } from 'react';
import { BarChart3, Calendar, Clock, FileText, Settings, Users, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AdminOverview from './AdminOverview';
import EmployeeDashboardSection from './EmployeeDashboardSection';
import AdminApprovalsSection from '@/components/leave/AdminApprovalsSection';
import AdminDocumentsSection from './AdminDocumentsSection';
import AdminNotificationsSection from './AdminNotificationsSection';
import AdminSettingsSection from './AdminSettingsSection';
import DashboardHeader from './DashboardHeader';
import AdminAttendanceSection from './AdminAttendanceSection';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<'overview' | 'employees' | 'leaves' | 'attendances' | 'documents' | 'notifications' | 'settings'>('overview');
  const { profile, loading } = useAuth();

  if (loading) {
    return <div>Caricamento...</div>;
  }

  if (!profile) {
    return <div>Utente non autorizzato</div>;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminOverview />;
      case 'employees':
        return <EmployeeDashboardSection />;
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
        return <AdminOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r min-h-screen">
          <div className="p-6">
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

        {/* Main content */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

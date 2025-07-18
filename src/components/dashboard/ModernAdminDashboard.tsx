
import { useState } from 'react';
import ModernAdminSidebar from './ModernAdminSidebar';
import ModernAdminHeader from './ModernAdminHeader';
import AdminDashboardOverview from './AdminDashboardOverview';
import AdminEmployeesSection from './AdminEmployeesSection';
import AdminAttendanceSection from './AdminAttendanceSection';
import AdminLeaveApprovalsSection from '../leave/AdminLeaveApprovalsSection';
import AdminDocumentsSection from './AdminDocumentsSection';
import AdminNotificationsSection from './AdminNotificationsSection';
import AdminSettingsSection from '../admin/AdminSettingsSection';
import AdminBusinessTripsManagement from '../admin/AdminBusinessTripsManagement';
import AdminSickLeavesManagement from '../admin/AdminSickLeavesManagement';
import AdminOvertimeSection from '../overtime/AdminOvertimeSection';
import AdminHolidaysManagement from '../admin/AdminHolidaysManagement';

const sectionTitles: Record<string, string> = {
  overview: 'Panoramica',
  employees: 'Dipendenti',
  'attendance-overview': 'Panoramica Presenze',
  'business-trips': 'Trasferte',
  'sick-leaves': 'Malattie',
  overtime: 'Straordinari',
  'company-holidays': 'Giorni Festivi',
  'leave-approvals': 'Approvazioni Ferie',
  documents: 'Documenti',
  notifications: 'Notifiche',
  settings: 'Impostazioni'
};

export default function ModernAdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview');

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'overview':
        return <AdminDashboardOverview />;
      case 'employees':
        return <AdminEmployeesSection />;
      case 'attendance-overview':
        return <AdminAttendanceSection />;
      case 'business-trips':
        return <AdminBusinessTripsManagement />;
      case 'sick-leaves':
        return <AdminSickLeavesManagement />;
      case 'overtime':
        return <AdminOvertimeSection />;
      case 'company-holidays':
        return <AdminHolidaysManagement />;
      case 'leave-approvals':
        return <AdminLeaveApprovalsSection />;
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
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <ModernAdminSidebar 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <ModernAdminHeader title={sectionTitles[activeSection] || 'Dashboard'} />
          
          <main className="flex-1 overflow-y-auto p-6">
            {renderActiveSection()}
          </main>
        </div>
      </div>
    </div>
  );
}

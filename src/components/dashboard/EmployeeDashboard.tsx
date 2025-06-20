import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import EmployeeDashboardContent from './EmployeeDashboardContent';
import EmployeeDashboardHeader from './EmployeeDashboardHeader';
import EmployeeDashboardSidebar from './EmployeeDashboardSidebar';
import EmployeeLeavePage from '@/components/leave/EmployeeLeavePage';
import DocumentsSection from './DocumentsSection';
import EmployeeMessagesSection from './EmployeeMessagesSection';
import EmployeeAttendanceSection from './EmployeeAttendanceSection';

export default function EmployeeDashboard() {
  const [activeSection, setActiveSection] = useState<'overview' | 'leaves' | 'attendances' | 'documents' | 'messages'>('overview');
  const { profile } = useAuth();

  if (!profile) {
    return <div>Loading...</div>;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <EmployeeDashboardContent />;
      case 'leaves':
        return <EmployeeLeavePage />;
      case 'attendances':
        return <EmployeeAttendanceSection />;
      case 'documents':
        return <DocumentsSection />;
      case 'messages':
        return <EmployeeMessagesSection />;
      default:
        return <EmployeeDashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeDashboardHeader />
      
      <div className="flex">
        <EmployeeDashboardSidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection} 
        />
        
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

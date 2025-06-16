
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { useNotifications } from "@/hooks/useNotifications";
import DashboardHeader from "./DashboardHeader";
import EmployeeDashboardHeader from "./EmployeeDashboardHeader";
import EmployeeDashboardSidebar from "./EmployeeDashboardSidebar";
import EmployeeDashboardContent from "./EmployeeDashboardContent";

const EmployeeDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const { profile } = useAuth();
  const { documents } = useDocuments();
  const { notifications } = useNotifications();

  const myDocuments = documents.filter(doc => doc.user_id === profile?.id);
  const unreadNotifications = notifications.filter(n => !n.is_read && n.user_id === profile?.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeDashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader 
          title="Dashboard Dipendente"
          subtitle="Visualizza i tuoi documenti, notifiche e statistiche"
        />
        
        <div className="flex space-x-8">
          <EmployeeDashboardSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            documentsCount={myDocuments.length}
            unreadNotificationsCount={unreadNotifications.length}
          />

          <EmployeeDashboardContent activeSection={activeSection} />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

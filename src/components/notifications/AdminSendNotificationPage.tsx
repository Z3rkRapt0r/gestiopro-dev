
import { useState } from "react";
import NotificationForm from "@/components/notifications/NotificationForm";
import SentNotificationsHistory from "@/components/notifications/SentNotificationsHistory";
import BrevoSetupGuide from "@/components/notifications/BrevoSetupGuide";

const AdminSendNotificationPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNotificationSent = () => {
    // Incrementa il refreshKey per aggiornare automaticamente la cronologia
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <BrevoSetupGuide />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Invia Notifica</h1>
            <p className="text-gray-600 mb-4">
              Invia notifiche ai dipendenti dell'azienda tramite email
            </p>
          </div>
          <NotificationForm onCreated={handleNotificationSent} />
        </div>
        
        <div>
          <SentNotificationsHistory refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
};

export default AdminSendNotificationPage;


import { useState } from "react";
import NotificationForm from "@/components/notifications/NotificationForm";
import SentNotificationsHistory from "@/components/notifications/SentNotificationsHistory";

const AdminSendNotificationPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Invia una nuova notifica</h2>
        <NotificationForm onCreated={() => setRefreshKey((k) => k + 1)} />
      </div>
      <div>
        <SentNotificationsHistory refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default AdminSendNotificationPage;

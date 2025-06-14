
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import NotificationsList from "@/components/notifications/NotificationsList";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const NotificationsSection = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "personal" | "unread">("all");

  useEffect(() => {
    const fetchNotifications = async () => {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      const { data } = await query;
      setNotifications(
        (data || []).filter((n) => {
          if (filter === "personal") return n.user_id === profile.id;
          if (filter === "unread") return !n.is_read && n.user_id === profile.id;
          // "all": personali + generali (notifiche inviate a tutti)
          // Con questa struttura, personali=user_id mio, generali=tutte le altre
          return n.user_id === profile.id || n.user_id !== profile.id;
        })
      );
    };
    fetchNotifications();
  }, [profile, filter]);

  const markRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  return (
    <div>
      <div className="flex gap-2 justify-end mb-2">
        <Button variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")}>Tutte</Button>
        <Button variant={filter === "personal" ? "default" : "ghost"} onClick={() => setFilter("personal")}>Personali</Button>
        <Button variant={filter === "unread" ? "default" : "ghost"} onClick={() => setFilter("unread")}>Non lette</Button>
      </div>
      <NotificationsList
        notifications={notifications}
        onMarkRead={markRead}
      />
    </div>
  );
};

export default NotificationsSection;


import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import NotificationsList from "@/components/notifications/NotificationsList";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const NotificationsSection = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "personal" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    const { data } = await query;

    // Mapping dei dati per renderli compatibili con NotificationsList
    const mapped = (data || []).map((n: any) => ({
      id: n.id,
      sender_id: n.created_by || null,
      recipient_id: n.user_id ?? null,
      is_global: n.user_id === null,
      subject: n.title,
      short_text: n.message,
      body: n.body || null,
      attachment_url: n.attachment_url || null,
      read_by: n.is_read
        ? [profile.id]
        : [], // dato che la tabella usa solo is_read boolean
      created_at: n.created_at,
    }));

    setNotifications(
      mapped.filter((n) => {
        if (filter === "personal")
          return n.recipient_id === profile.id;
        if (filter === "unread")
          return n.read_by?.includes(profile.id) === false && n.recipient_id === profile.id;
        // tutte: personali (user_id mio) + generali (user_id nullo)
        return n.recipient_id === profile.id || n.is_global;
      })
    );
  }, [profile, filter]);

  useEffect(() => {
    if (profile?.id) {
      fetchNotifications();
    }
  }, [profile, filter, fetchNotifications]);

  const markRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true, read_by: [profile.id] } : n
      )
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


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'document' | 'system' | 'message' | 'announcement';
  is_read: boolean;
  created_by: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async (
    userId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'system'
  ) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          created_by: user.id,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Successo",
        description: "Notifica inviata correttamente",
      });

      await fetchNotifications();
      return { error: null };
    } catch (error: any) {
      console.error('Error creating notification:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'invio della notifica",
        variant: "destructive",
      });
      return { error };
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        throw error;
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );

      toast({
        title: "Successo",
        description: "Tutte le notifiche sono state segnate come lette",
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  return {
    notifications,
    loading,
    createNotification,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
  };
};

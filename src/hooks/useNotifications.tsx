
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  body?: string;
  attachment_url?: string;
  type: 'document' | 'system' | 'message' | 'announcement' | 'leave_request' | 'permission_request' | 'sick_leave';
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
    if (!user) {
      console.log('useNotifications: No user found, skipping fetch');
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching notifications for user:', user.id);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, body, attachment_url, type, is_read, created_by, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user notifications:', error);
        return;
      }

      console.log('User specific notifications:', data);

      // Ensure type is properly typed
      const typedNotifications: Notification[] = (data || []).map(notification => ({
        ...notification,
        type: notification.type as Notification['type'] || 'system'
      }));

      console.log('Typed notifications:', typedNotifications);
      setNotifications(typedNotifications);
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
    type: Notification['type'] = 'system',
    body?: string
  ) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      console.log('Creating notification:', { userId, title, message, type, body });
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          body,
          type,
          created_by: user.id,
        });

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      console.log('Notification created successfully');
      
      // Se la notifica è per l'utente corrente, aggiorna la lista
      if (userId === user.id) {
        await fetchNotifications();
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error creating notification:', error);
      return { error };
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      console.log('Marking notification as read:', notificationId);
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      console.log('Notification marked as read successfully');
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      console.log('Marking all notifications as read for user:', user.id);
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );

      toast({
        title: "Successo",
        description: "Tutte le notifiche sono state segnate come lette",
      });
      
      console.log('All notifications marked as read successfully');
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Real-time subscription per le notifiche
  useEffect(() => {
    if (!user) {
      console.log('useNotifications: No user, clearing notifications');
      setNotifications([]);
      return;
    }

    console.log('useNotifications: User found, setting up subscription for:', user.id);
    
    // Fetch initial notifications
    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time notification update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            
            // Show toast for new notifications
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification;
            setNotifications(prev =>
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up notifications subscription');
      supabase.removeChannel(channel);
    };
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

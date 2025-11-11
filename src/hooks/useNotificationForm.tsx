import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface NotificationInput {
  recipientId: string | null; // null for ALL
  subject: string;
  shortText: string;
  body?: string;
  file?: File | null;
  topic?: string;
  employeeEmail?: string;
  adminMessage?: string;
  emailBody?: string;
  employeeName?: string;
  employeeNote?: string;
}

export const useNotificationForm = (onCreated?: () => void) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const sendNotification = async ({
    recipientId,
    subject,
    shortText,
    body,
    file,
    topic,
    employeeEmail,
    adminMessage,
    emailBody,
    employeeName,
    employeeNote,
  }: NotificationInput) => {
    setLoading(true);

    try {
      console.log('useNotificationForm: Starting notification send process');
      console.log('Parameters:', { 
        recipientId, 
        subject, 
        shortText, 
        body, 
        topic, 
        employeeEmail,
        adminMessage, // FIXED: Log admin message
        emailBody,
        employeeName,
        employeeNote
      });
      
      let attachment_url: string | null = null;

      if (file) {
        console.log('useNotificationForm: Uploading file...');
        const filename = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("notification-attachments")
          .upload(filename, file);

        if (error) {
          console.error('File upload error:', error);
          throw error;
        }
        attachment_url = data?.path || null;
        console.log('File uploaded successfully:', attachment_url);
      }

      // For notifications table, use "message" for manual admin notifications to appear in employee message center
      const notificationData = {
        title: subject,
        message: shortText,
        type: profile?.role === 'admin' && topic !== 'document' ? "message" : (topic || "notifiche"),
        category: topic || "notifiche", // Tutto diventa "notifiche"
        body,
        attachment_url,
        created_by: profile?.id,
        is_read: false
      };

      // Tutto diventa "notifiche" - semplificazione drastica
      const mapTopicToCategory = (topic: string | undefined): string => {
        return 'notifiche'; // Una sola categoria per tutto
      };

      const validCategory = mapTopicToCategory(topic);
      console.log('Topic:', topic, '-> Category:', validCategory);

      // Update notificationData with valid category
      notificationData.category = validCategory;

      console.log('Notification data to insert:', notificationData);

      if (!recipientId) {
        // Send to all appropriate users based on topic and sender
        console.log('useNotificationForm: Determining recipients for broadcast notification');
        
        if (topic === 'document' && profile?.role !== 'admin') {
          // Employee sending document notification - send to all admins
          console.log('useNotificationForm: Employee document notification - sending to all admins');
          const { data: adminProfiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name")
            .eq("role", "admin")
            .eq("is_active", true);
            
          if (profilesError) {
            console.error('Error fetching admin profiles:', profilesError);
            throw profilesError;
          }

          console.log('Found admin profiles:', adminProfiles);

            const notificationsToInsert = (adminProfiles || []).map(p => ({
              user_id: p.id,
              title: subject,
              message: shortText,
              type: profile?.role === 'admin' && topic !== 'document' ? "message" : (topic || "notifiche"),
              category: validCategory,
              body,
              attachment_url,
              created_by: profile?.id,
              is_read: false
            }));

          if (notificationsToInsert.length > 0) {
            const { data: insertData, error: insertError } = await supabase
              .from("notifications")
              .insert(notificationsToInsert)
              .select();
              
            if (insertError) {
              console.error('Error inserting admin notifications:', insertError);
              throw insertError;
            }
            
            console.log('Notifications created successfully for admins:', insertData);
          }
        } else {
          // General broadcast - send to all active users
          console.log('useNotificationForm: General broadcast - sending to all employees');
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, first_name, last_name")
            .eq("is_active", true);
            
          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            throw profilesError;
          }

          console.log('Found active profiles:', profiles);

          const notificationsToInsert = (profiles || []).map(p => ({
            user_id: p.id,
            title: subject,
            message: shortText,
            type: profile?.role === 'admin' && topic !== 'document' ? "message" : (topic || "notifiche"),
            category: validCategory,
            body,
            attachment_url,
            created_by: profile?.id,
            is_read: false
          }));

          if (notificationsToInsert.length > 0) {
            const { data: insertData, error: insertError } = await supabase
              .from("notifications")
              .insert(notificationsToInsert)
              .select();
              
            if (insertError) {
              console.error('Error inserting notifications:', insertError);
              throw insertError;
            }
            
            console.log('Notifications created successfully for all employees:', insertData);
          }
        }
      } else {
        // Send to specific recipient
        console.log('useNotificationForm: Sending to single recipient:', recipientId);
        
        const singleNotificationData = {
          user_id: recipientId,
          title: subject,
          message: shortText,
          type: profile?.role === 'admin' && topic !== 'document' ? "message" : (topic || "notifiche"),
          category: validCategory,
          body,
          attachment_url,
          created_by: profile?.id,
          is_read: false
        };

        console.log('Single notification data:', singleNotificationData);
        
        const { data: insertData, error: insertError } = await supabase
          .from("notifications")
          .insert(singleNotificationData)
          .select();
          
        if (insertError) {
          console.error('Error inserting notification:', insertError);
          throw insertError;
        }
        
        console.log('Notification created successfully for user:', recipientId, insertData);
      }

      // Save to sent notifications history ONLY if user is admin
      if (profile?.role === 'admin') {
        console.log("Saving to sent_notifications table (admin user)...");
        const { error: sentNotificationError } = await supabase
          .from("sent_notifications")
          .insert({
            admin_id: profile?.id,
            recipient_id: recipientId,
            title: subject,
            message: shortText,
            body,
            type: topic || "system", // Keep original topic for admin categorization
            attachment_url
          });

        if (sentNotificationError) {
          console.error("Error saving to sent_notifications:", sentNotificationError);
          throw sentNotificationError;
        }

        console.log("Successfully saved to sent_notifications table");
      } else {
        console.log("Skipping sent_notifications table (non-admin user)");
      }

      // Send email via Edge Function
      console.log("Calling send-notification-email function...");
      
      const emailPayload: any = {
        recipientId,
        subject,
        shortText,
        topic: topic || "notification",
        adminMessage: adminMessage || emailBody || body, // Try multiple sources for admin message
        emailBody: emailBody || adminMessage || body, // Backwards compatibility
        employeeName: employeeName,
        employeeNote: employeeNote,
      };

      // Include employee email for reply-to if available
      if (employeeEmail) {
        emailPayload.employeeEmail = employeeEmail;
        console.log('Adding employee email to notification payload:', employeeEmail);
      } else if (profile?.role !== 'admin' && profile?.email) {
        // If sender is not admin, use their email for reply-to
        emailPayload.employeeEmail = profile.email;
        console.log('Adding sender employee email to notification payload:', profile.email);
      }

      console.log('Final email payload with admin message:', emailPayload);

      // Send email in fire-and-forget mode - don't wait for response
      // This prevents timeout errors from affecting the user experience
      supabase.functions.invoke(
        'send-notification-email',
        {
          body: emailPayload
        }
      ).then(({ data: emailResult, error: emailError }) => {
      if (emailError) {
        console.error("Email function error:", emailError);
          console.warn("Email sending failed but notification was saved:", emailError.message);
      } else {
        console.log("Email function success:", emailResult);
        }
      }).catch((emailInvokeError) => {
        console.error("Email function invoke error:", emailInvokeError);
        console.warn("Email function invoke failed but notification was saved");
      });

      // Show success toast immediately
        toast({
          title: "Notifica inviata",
        description: "La notifica è stata inviata con successo.",
        });
      
      // Call onCreated callback
      console.log("useNotificationForm: calling onCreated callback after delay");
      setTimeout(() => {
        onCreated?.();
      }, 100);
    } catch (e: any) {
      console.error("Notification error:", e);
      toast({
        title: "Errore",
        description: e.message || "Errore nell'invio notifica.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { sendNotification, loading };
};

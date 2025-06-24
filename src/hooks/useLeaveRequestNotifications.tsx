
import { supabase } from "@/integrations/supabase/client";

export const useLeaveRequestNotifications = () => {
  const sendLeaveRequestNotification = async (
    leaveRequest: any,
    employeeProfile: any,
    adminNote?: string,
    isApproval: boolean = false,
    isRejection: boolean = false
  ) => {
    try {
      console.log('[LeaveRequestNotifications] Sending notification:', { 
        leaveRequest, 
        employeeProfile, 
        adminNote, 
        isApproval, 
        isRejection,
        employeeEmail: employeeProfile?.email 
      });

      let topic, subject, shortText, body;
      let recipientId = null; // Default to all admins

      if (isApproval) {
        // Approval notification goes to the employee
        topic = 'permessi-approvazione';
        subject = `Richiesta ${leaveRequest.type === 'ferie' ? 'ferie' : 'permesso'} approvata`;
        shortText = `La tua richiesta di ${leaveRequest.type === 'ferie' ? 'ferie' : 'permesso'} è stata approvata.`;
        recipientId = leaveRequest.user_id; // Send to the employee
        body = `Dal: ${leaveRequest.date_from || leaveRequest.day}\nAl: ${leaveRequest.date_to || leaveRequest.day}\n\nLa tua richiesta è stata approvata dall'amministratore.`;
      } else if (isRejection) {
        // Rejection notification goes to the employee
        topic = 'permessi-rifiuto';
        subject = `Richiesta ${leaveRequest.type === 'ferie' ? 'ferie' : 'permesso'} rifiutata`;
        shortText = `La tua richiesta di ${leaveRequest.type === 'ferie' ? 'ferie' : 'permesso'} è stata rifiutata.`;
        recipientId = leaveRequest.user_id; // Send to the employee
        body = `Dal: ${leaveRequest.date_from || leaveRequest.day}\nAl: ${leaveRequest.date_to || leaveRequest.day}\n\nLa tua richiesta è stata rifiutata dall'amministratore.`;
      } else {
        // New leave request notification goes to all admins
        topic = 'permessi-richiesta';
        subject = `Nuova richiesta ${leaveRequest.type === 'ferie' ? 'ferie' : 'permesso'} da ${employeeProfile.first_name} ${employeeProfile.last_name}`;
        shortText = `${employeeProfile.first_name} ${employeeProfile.last_name} ha inviato una nuova richiesta di ${leaveRequest.type === 'ferie' ? 'ferie' : 'permesso'}.`;
        recipientId = null; // Send to all admins
        
        if (leaveRequest.type === 'ferie') {
          body = `Dal: ${leaveRequest.date_from}\nAl: ${leaveRequest.date_to}\n\nAccedi alla dashboard per approvare o rifiutare la richiesta.`;
        } else {
          const timeInfo = leaveRequest.time_from && leaveRequest.time_to 
            ? `dalle ${leaveRequest.time_from} alle ${leaveRequest.time_to}`
            : 'giornata intera';
          body = `Data: ${leaveRequest.day}\nOrario: ${timeInfo}\n\nAccedi alla dashboard per approvare o rifiutare la richiesta.`;
        }
      }

      // Prepare email payload
      const emailPayload: any = {
        recipientId,
        subject,
        shortText,
        topic,
        body,
        adminNote
      };

      // For new leave requests from employee to admin, include employee email for reply-to
      if (!isApproval && !isRejection && employeeProfile?.email) {
        emailPayload.employeeEmail = employeeProfile.email;
        console.log('[LeaveRequestNotifications] Adding employee email for leave request notification:', employeeProfile.email);
      }

      console.log('[LeaveRequestNotifications] Final email payload:', emailPayload);

      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: emailPayload
      });

      if (error) {
        console.error('[LeaveRequestNotifications] Error sending notification:', error);
        throw error;
      }

      console.log('[LeaveRequestNotifications] Notification sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('[LeaveRequestNotifications] Failed to send notification:', error);
      return { success: false, error };
    }
  };

  const notifyEmployee = async ({
    requestId,
    employeeId,
    status,
    adminNote,
    type,
    details,
  }: {
    requestId: string;
    employeeId: string;
    status: 'approved' | 'rejected';
    adminNote?: string;
    type: string;
    details: string;
  }) => {
    try {
      console.log('[LeaveRequestNotifications] NotifyEmployee called:', { requestId, employeeId, status, type });
      
      // Get employee profile
      const { data: employeeProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (profileError) {
        console.error('[LeaveRequestNotifications] Error fetching employee profile:', profileError);
        throw profileError;
      }

      console.log('[LeaveRequestNotifications] Found employee profile:', employeeProfile);

      // Create mock leave request object for notification
      const mockLeaveRequest = {
        id: requestId,
        user_id: employeeId,
        type,
        date_from: details.includes('Dal:') ? details.split('Dal: ')[1]?.split('\n')[0] : null,
        date_to: details.includes('Al:') ? details.split('Al: ')[1]?.split('\n')[0] : null,
        day: details.includes('Giorno:') ? details.split('Giorno: ')[1]?.split('\n')[0] : null,
      };

      return await sendLeaveRequestNotification(
        mockLeaveRequest,
        employeeProfile,
        adminNote,
        status === 'approved',
        status === 'rejected'
      );
    } catch (error) {
      console.error('[LeaveRequestNotifications] Error in notifyEmployee:', error);
      return { success: false, error };
    }
  };

  const notifyAdmin = async ({
    requestId,
    employeeName,
    type,
    details,
    employeeId,
  }: {
    requestId: string;
    employeeName: string;
    type: string;
    details: string;
    employeeId?: string;
  }) => {
    try {
      console.log('[LeaveRequestNotifications] NotifyAdmin called:', { requestId, employeeName, type, employeeId });
      
      // Fetch actual employee profile to get the real email
      let employeeProfile: any = {
        first_name: employeeName.split(' ')[0] || '',
        last_name: employeeName.split(' ').slice(1).join(' ') || '',
        email: '', // Will be populated below if employeeId is provided
      };

      if (employeeId) {
        console.log('[LeaveRequestNotifications] Fetching employee profile for ID:', employeeId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', employeeId)
          .single();

        if (!profileError && profile) {
          employeeProfile = profile;
          console.log('[LeaveRequestNotifications] Found employee profile with email:', profile.email);
        } else {
          console.error('[LeaveRequestNotifications] Error fetching employee profile:', profileError);
        }
      }

      // Create mock objects for notification
      const mockLeaveRequest = {
        id: requestId,
        type,
        user_id: employeeId,
        date_from: details.includes('Dal:') ? details.split('Dal: ')[1]?.split('\n')[0] : null,
        date_to: details.includes('Al:') ? details.split('Al: ')[1]?.split('\n')[0] : null,
        day: details.includes('Giorno:') ? details.split('Giorno: ')[1]?.split('\n')[0] : null,
        time_from: details.includes('Orario:') && details.includes(' - ') ? 
          details.split('Orario: ')[1]?.split(' - ')[0] : null,
        time_to: details.includes('Orario:') && details.includes(' - ') ? 
          details.split(' - ')[1]?.split('\n')[0] : null,
      };

      console.log('[LeaveRequestNotifications] Sending notification with employee profile:', employeeProfile);

      return await sendLeaveRequestNotification(
        mockLeaveRequest,
        employeeProfile
      );
    } catch (error) {
      console.error('[LeaveRequestNotifications] Error in notifyAdmin:', error);
      return { success: false, error };
    }
  };

  return { 
    sendLeaveRequestNotification,
    notifyEmployee,
    notifyAdmin
  };
};

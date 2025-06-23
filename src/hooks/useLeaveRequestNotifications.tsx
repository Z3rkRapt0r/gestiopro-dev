
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
      console.log('Sending leave request notification:', { leaveRequest, employeeProfile, adminNote, isApproval, isRejection });

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
        userId: employeeProfile.id,
        topic,
        body,
        adminNote
      };

      // For new leave requests from employee to admin, include employee email for reply-to
      if (!isApproval && !isRejection && employeeProfile.email) {
        emailPayload.employeeEmail = employeeProfile.email;
        console.log('Adding employee email for leave request notification:', employeeProfile.email);
      }

      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: emailPayload
      });

      if (error) {
        console.error('Error sending leave request notification:', error);
        throw error;
      }

      console.log('Leave request notification sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to send leave request notification:', error);
      return { success: false, error };
    }
  };

  return { sendLeaveRequestNotification };
};

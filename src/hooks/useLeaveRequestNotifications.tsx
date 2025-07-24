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

      // FIXED: Construct proper employee name from profile
      const employeeFullName = employeeProfile?.first_name && employeeProfile?.last_name 
        ? `${employeeProfile.first_name} ${employeeProfile.last_name}`
        : (employeeProfile?.first_name || 'Dipendente');
      
      console.log('Using employee full name:', employeeFullName);

      if (isApproval) {
        // ABSOLUTE PRIORITY: Database template takes precedence - NO hardcoded content
        topic = leaveRequest.type === 'ferie' ? 'ferie-approvazione' : 'permessi-approvazione';
        subject = null; // Let database template decide
        shortText = null; // Let database template decide
        recipientId = leaveRequest.user_id; // Send to the employee
        
        // CLEANED: Only pure request details - no admin notes or confirmation messages
        if (leaveRequest.type === 'ferie') {
          body = `📅 DETTAGLI RICHIESTA FERIE\n\nDipendente: ${employeeFullName}\nData inizio: ${leaveRequest.date_from}\nData fine: ${leaveRequest.date_to}`;
        } else {
          const timeInfo = leaveRequest.time_from && leaveRequest.time_to 
            ? `dalle ${leaveRequest.time_from} alle ${leaveRequest.time_to}`
            : 'giornata intera';
          body = `📅 DETTAGLI RICHIESTA PERMESSO\n\nDipendente: ${employeeFullName}\nData: ${leaveRequest.day || leaveRequest.date_from}\nOrario: ${timeInfo}`;
        }
      } else if (isRejection) {
        // ABSOLUTE PRIORITY: Database template takes precedence - NO hardcoded content
        topic = leaveRequest.type === 'ferie' ? 'ferie-rifiuto' : 'permessi-rifiuto';
        subject = null; // Let database template decide
        shortText = null; // Let database template decide
        recipientId = leaveRequest.user_id; // Send to the employee
        
        // CLEANED: Only pure request details - no admin notes or confirmation messages
        if (leaveRequest.type === 'ferie') {
          body = `📅 DETTAGLI RICHIESTA FERIE\n\nDipendente: ${employeeFullName}\nData inizio: ${leaveRequest.date_from}\nData fine: ${leaveRequest.date_to}`;
        } else {
          const timeInfo = leaveRequest.time_from && leaveRequest.time_to 
            ? `dalle ${leaveRequest.time_from} alle ${leaveRequest.time_to}`
            : 'giornata intera';
          body = `📅 DETTAGLI RICHIESTA PERMESSO\n\nDipendente: ${employeeFullName}\nData: ${leaveRequest.day || leaveRequest.date_from}\nOrario: ${timeInfo}`;
        }
      } else {
        // New leave request notification goes to all admins - use specific template type
        topic = leaveRequest.type === 'ferie' ? 'ferie-richiesta' : 'permessi-richiesta';
        subject = `Nuova richiesta ${leaveRequest.type === 'ferie' ? 'ferie' : 'permesso'} da ${employeeFullName}`;
        shortText = `${employeeFullName} ha inviato una nuova richiesta di ${leaveRequest.type === 'ferie' ? 'ferie' : 'permesso'}.`;
        recipientId = null; // Send to all admins
        
        // CLEANED: Only pure request details with employee note if present
        if (leaveRequest.type === 'ferie') {
          body = `📅 DETTAGLI RICHIESTA FERIE\n\nDipendente: ${employeeFullName}\nData inizio: ${leaveRequest.date_from}\nData fine: ${leaveRequest.date_to}${leaveRequest.note ? `\n\nNote del dipendente:\n${leaveRequest.note}` : ''}`;
        } else {
          const timeInfo = leaveRequest.time_from && leaveRequest.time_to 
            ? `dalle ${leaveRequest.time_from} alle ${leaveRequest.time_to}`
            : 'giornata intera';
          body = `📅 DETTAGLI RICHIESTA PERMESSO\n\nDipendente: ${employeeFullName}\nData: ${leaveRequest.day}\nOrario: ${timeInfo}${leaveRequest.note ? `\n\nNote del dipendente:\n${leaveRequest.note}` : ''}`;
        }
      }

      // CRITICAL FIX: Prepare email payload with proper parameters for all leave types
      const emailPayload: any = {
        recipientId,
        subject, // Can be null for database template priority
        shortText, // Can be null for database template priority
        topic,
        body,
        employeeName: employeeFullName // FIXED: Pass the constructed full name
      };

      // FIXED: Add adminNote for approvals and rejections - this will be handled separately by the template
      if ((isApproval || isRejection) && adminNote) {
        emailPayload.adminNote = adminNote;
        console.log('Adding admin note for leave response notification:', adminNote);
      }

      // FIXED: Do NOT include employeeEmail for new leave requests to ensure they are treated as internal admin notifications
      // This ensures all leave requests are sent from the configured Brevo sender to admin recipients

      // FIXED: Add employee note for leave requests - this is already included in body for new requests
      if (!isApproval && !isRejection && leaveRequest.note) {
        emailPayload.employeeNote = leaveRequest.note;
        console.log('Adding employee note for leave request:', leaveRequest.note);
      }

      console.log('Sending leave request notification payload:', emailPayload);

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
      // Get employee profile with email
      const { data: employeeProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', employeeId)
        .single();

      if (profileError) {
        console.error('Error fetching employee profile:', profileError);
        throw profileError;
      }

      console.log('Employee profile for notification:', employeeProfile);

      // Create mock leave request object for notification
      const mockLeaveRequest = {
        id: requestId,
        user_id: employeeId,
        type,
        // Parse details to extract date info
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
      console.error('Error in notifyEmployee:', error);
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
      // FIXED: Get employee profile with email if employeeId is provided
      let employeeProfile = {
        first_name: employeeName.split(' ')[0] || '',
        last_name: employeeName.split(' ').slice(1).join(' ') || '',
        email: '',
      };

      if (employeeId) {
        console.log('Fetching employee profile for admin notification:', employeeId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', employeeId)
          .single();

        if (profile && !profileError) {
          employeeProfile = profile;
          console.log('Found employee profile:', employeeProfile);
        } else {
          console.warn('Could not fetch employee profile:', profileError);
          // Keep the constructed profile from employeeName as fallback
        }
      }

      // Create mock objects for notification
      const mockLeaveRequest = {
        id: requestId,
        type,
        // Parse details to extract date info
        date_from: details.includes('Dal:') ? details.split('Dal: ')[1]?.split('\n')[0] : null,
        date_to: details.includes('Al:') ? details.split('Al: ')[1]?.split('\n')[0] : null,
        day: details.includes('Giorno:') ? details.split('Giorno: ')[1]?.split('\n')[0] : null,
        time_from: details.includes('Orario:') && details.includes(' - ') ? 
          details.split('Orario: ')[1]?.split(' - ')[0] : null,
        time_to: details.includes('Orario:') && details.includes(' - ') ? 
          details.split(' - ')[1]?.split('\n')[0] : null,
      };

      console.log('Sending admin notification with employee profile:', employeeProfile);

      return await sendLeaveRequestNotification(
        mockLeaveRequest,
        employeeProfile
      );
    } catch (error) {
      console.error('Error in notifyAdmin:', error);
      return { success: false, error };
    }
  };

  return { 
    sendLeaveRequestNotification,
    notifyEmployee,
    notifyAdmin
  };
};

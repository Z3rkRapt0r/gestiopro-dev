
import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'document' | 'system' | 'message' | 'announcement' | 'leave_request' | 'permission_request';
  body?: string;
  createdBy?: string;
}

export const createSystemNotification = async (data: NotificationData) => {
  try {
    console.log('Creating system notification:', data);
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.userId,
        title: data.title,
        message: data.message,
        body: data.body,
        type: data.type,
        created_by: data.createdBy || null,
      });

    if (error) {
      console.error('Error creating system notification:', error);
      throw error;
    }

    console.log('System notification created successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create system notification:', error);
    return { success: false, error };
  }
};

// Utility functions for specific notification types
export const notifyLeaveRequest = async (userId: string, requestType: string, dates: string) => {
  const typeMap = {
    'ferie': 'leave_request',
    'permesso': 'permission_request'
  } as const;

  const emojiMap = {
    'ferie': '🏖️',
    'permesso': '📅'
  } as const;

  const titleMap = {
    'ferie': 'Richiesta Ferie Inviata',
    'permesso': 'Richiesta Permesso Inviata'
  } as const;

  return createSystemNotification({
    userId,
    title: titleMap[requestType as keyof typeof titleMap] || 'Richiesta Inviata',
    message: `${emojiMap[requestType as keyof typeof emojiMap] || '📋'} La tua richiesta di ${requestType} per ${dates} è stata inviata ed è in attesa di approvazione.`,
    type: typeMap[requestType as keyof typeof typeMap] || 'system',
    body: `Dettagli richiesta:\nTipo: ${requestType}\nPeriodo: ${dates}\nStato: In attesa di approvazione`
  });
};

export const notifyDocumentUpload = async (userId: string, documentTitle: string, documentType: string) => {
  return createSystemNotification({
    userId,
    title: 'Nuovo Documento Caricato',
    message: `📄 È stato caricato un nuovo documento: ${documentTitle}`,
    type: 'document',
    body: `Documento: ${documentTitle}\nTipo: ${documentType}\nIl documento è ora disponibile nella tua area documenti.`
  });
};

export const notifyRequestStatusUpdate = async (
  userId: string, 
  requestType: string, 
  status: 'approved' | 'rejected',
  dates: string,
  adminNote?: string
) => {
  const statusText = status === 'approved' ? 'approvata' : 'rifiutata';
  const emoji = status === 'approved' ? '✅' : '❌';
  
  const typeEmoji = {
    'ferie': '🏖️',
    'permesso': '📅'
  } as const;

  return createSystemNotification({
    userId,
    title: `Richiesta ${requestType} ${statusText}`,
    message: `${emoji} La tua richiesta di ${requestType} per ${dates} è stata ${statusText}.`,
    type: requestType === 'ferie' ? 'leave_request' : 'permission_request',
    body: adminNote ? `Note dell'amministratore: ${adminNote}` : undefined
  });
};

export const notifyBusinessTripUpdate = async (
  userId: string,
  destination: string,
  status: 'approved' | 'rejected',
  dates: string,
  adminNote?: string
) => {
  const statusText = status === 'approved' ? 'approvata' : 'rifiutata';
  const emoji = status === 'approved' ? '✅' : '❌';
  
  return createSystemNotification({
    userId,
    title: `Trasferta ${statusText}`,
    message: `${emoji} La tua richiesta di trasferta a ${destination} per ${dates} è stata ${statusText}.`,
    type: 'system',
    body: adminNote ? `Note dell'amministratore: ${adminNote}` : undefined
  });
};

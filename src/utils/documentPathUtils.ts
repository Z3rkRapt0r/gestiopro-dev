
import { supabase } from '@/integrations/supabase/client';

// Mappatura dei tipi di documento in italiano per le cartelle
export const DOCUMENT_TYPE_FOLDER_MAP: Record<string, string> = {
  'payslip': 'Buste_Paga',
  'transfer': 'Bonifici', 
  'communication': 'Comunicazioni',
  'medical_certificate': 'Certificati_Medici',
  'leave_request': 'Richieste_Ferie',
  'expense_report': 'Note_Spese',
  'contract': 'Contratti',
  'other': 'Altri_Documenti',
};

// Mappatura dei tipi di documento in italiano per le etichette
export const DOCUMENT_TYPE_LABEL_MAP: Record<string, string> = {
  'payslip': 'Busta Paga',
  'transfer': 'Bonifico',
  'communication': 'Comunicazione',
  'medical_certificate': 'Certificato Medico',
  'leave_request': 'Richiesta Ferie',
  'expense_report': 'Nota Spese',
  'contract': 'Contratto',
  'other': 'Altro',
};

/**
 * Sanitizza una stringa per renderla sicura per l'uso come nome di cartella
 */
export const sanitizeForFilesystem = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/[^a-zA-Z0-9]/g, '_') // Sostituisce caratteri speciali con underscore
    .replace(/_+/g, '_') // Rimuove underscore multipli
    .replace(/^_|_$/g, ''); // Rimuove underscore all'inizio e alla fine
};

/**
 * Genera il nome della cartella per un dipendente (solo per visualizzazione)
 */
export const generateEmployeeFolderName = (
  firstName: string | null,
  lastName: string | null,
  email: string | null,
  userId: string
): string => {
  if (firstName && lastName) {
    const sanitizedFirstName = sanitizeForFilesystem(firstName);
    const sanitizedLastName = sanitizeForFilesystem(lastName);
    return `${sanitizedFirstName}_${sanitizedLastName}`;
  } else if (email) {
    const emailName = email.split('@')[0];
    return sanitizeForFilesystem(emailName);
  } else {
    return `Dipendente_${userId.substring(0, 8)}`;
  }
};

/**
 * Genera il path completo per un documento
 * AGGIORNATO: Per i documenti personali usa sempre l'UUID dell'utente come prima cartella
 */
export const generateDocumentPath = async (
  file: File,
  documentType: string,
  targetUserId: string,
  isPersonalDocument: boolean
): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const fileName = `${Date.now()}_${file.name}`;
  
  // Ottieni il tipo di documento in italiano
  const documentTypeFolder = DOCUMENT_TYPE_FOLDER_MAP[documentType] || 'Altri_Documenti';
  
  if (!isPersonalDocument) {
    // Documenti aziendali - struttura invariata
    return `Documenti_Aziendali/${documentTypeFolder}/${year}/${month}/${fileName}`;
  }
  
  // Documenti personali - usa sempre l'UUID dell'utente come prima cartella
  // Questo è compatibile con le policy RLS che si aspettano auth.uid()::text = (storage.foldername(name))[1]
  return `${targetUserId}/${documentTypeFolder}/${year}/${month}/${fileName}`;
};

/**
 * Estrae informazioni dal path di un documento
 * AGGIORNATO: Gestisce sia i path vecchi (con nome leggibile) che quelli nuovi (con UUID)
 */
export const parseDocumentPath = (filePath: string) => {
  const parts = filePath.split('/');
  
  if (parts[0] === 'Documenti_Aziendali') {
    return {
      isCompanyDocument: true,
      employeeName: null,
      employeeId: null,
      documentType: parts[1],
      year: parts[2],
      month: parts[3],
      fileName: parts[4]
    };
  } else {
    // Determina se il primo segmento è un UUID o un nome leggibile
    const firstPart = parts[0];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstPart);
    
    return {
      isCompanyDocument: false,
      employeeName: isUuid ? null : firstPart?.replace(/_/g, ' '), // Solo per path vecchi
      employeeId: isUuid ? firstPart : null, // Solo per path nuovi
      documentType: parts[1],
      year: parts[2],
      month: parts[3],
      fileName: parts[4]
    };
  }
};

/**
 * Ottiene il nome leggibile del dipendente dal suo ID
 */
export const getEmployeeDisplayName = async (userId: string): Promise<string> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      return `Dipendente_${userId.substring(0, 8)}`;
    }
    
    return generateEmployeeFolderName(
      profile.first_name,
      profile.last_name,
      profile.email,
      userId
    );
  } catch (error) {
    console.error('Errore durante il recupero del nome dipendente:', error);
    return `Dipendente_${userId.substring(0, 8)}`;
  }
};

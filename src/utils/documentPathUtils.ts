
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
 * Genera il nome della cartella per un dipendente
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
    // Documenti aziendali
    return `Documenti_Aziendali/${documentTypeFolder}/${year}/${month}/${fileName}`;
  }
  
  // Documenti personali - ottieni i dati del dipendente
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', targetUserId)
      .single();
    
    if (error || !profile) {
      console.warn('Impossibile ottenere il profilo del dipendente, uso fallback UUID');
      return `Dipendente_${targetUserId.substring(0, 8)}/${documentTypeFolder}/${year}/${month}/${fileName}`;
    }
    
    const employeeFolder = generateEmployeeFolderName(
      profile.first_name,
      profile.last_name,
      profile.email,
      targetUserId
    );
    
    return `${employeeFolder}/${documentTypeFolder}/${year}/${month}/${fileName}`;
    
  } catch (error) {
    console.error('Errore durante la generazione del path:', error);
    return `Dipendente_${targetUserId.substring(0, 8)}/${documentTypeFolder}/${year}/${month}/${fileName}`;
  }
};

/**
 * Estrae informazioni dal path di un documento
 */
export const parseDocumentPath = (filePath: string) => {
  const parts = filePath.split('/');
  
  if (parts[0] === 'Documenti_Aziendali') {
    return {
      isCompanyDocument: true,
      employeeName: null,
      documentType: parts[1],
      year: parts[2],
      month: parts[3],
      fileName: parts[4]
    };
  } else {
    return {
      isCompanyDocument: false,
      employeeName: parts[0]?.replace(/_/g, ' '),
      documentType: parts[1],
      year: parts[2],
      month: parts[3],
      fileName: parts[4]
    };
  }
};

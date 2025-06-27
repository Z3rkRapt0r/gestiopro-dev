
import { supabase } from '@/integrations/supabase/client';

// Mappatura dei tipi di operazioni in italiano
export const OPERATION_TYPE_FOLDER_MAP: Record<string, string> = {
  // Ferie e Permessi
  'ferie': 'Ferie',
  'permesso': 'Permessi',
  
  // Presenze
  'presenza_normale': 'Presenze_Normali',
  'presenza_manuale': 'Presenze_Manuali',
  'malattia': 'Malattie',
  'viaggio_lavoro': 'Viaggi_Lavoro',
  
  // Notifiche
  'notifica_sistema': 'Notifiche_Sistema',
  'notifica_admin': 'Notifiche_Admin',
  'messaggio': 'Messaggi',
  
  // Documenti (già esistente)
  'payslip': 'Buste_Paga',
  'transfer': 'Bonifici',
  'communication': 'Comunicazioni',
  'medical_certificate': 'Certificati_Medici',
  'leave_request': 'Richieste_Ferie',
  'expense_report': 'Note_Spese',
  'contract': 'Contratti',
  'other': 'Altri_Documenti',
};

// Mappatura delle etichette leggibili
export const OPERATION_TYPE_LABEL_MAP: Record<string, string> = {
  'ferie': 'Ferie',
  'permesso': 'Permesso',
  'presenza_normale': 'Presenza Normale',
  'presenza_manuale': 'Presenza Manuale',
  'malattia': 'Malattia',
  'viaggio_lavoro': 'Viaggio di Lavoro',
  'notifica_sistema': 'Notifica Sistema',
  'notifica_admin': 'Notifica Admin',
  'messaggio': 'Messaggio',
};

/**
 * Sanitizza una stringa per renderla sicura per l'uso come nome di cartella
 */
export const sanitizeForPath = (text: string): string => {
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
    const sanitizedFirstName = sanitizeForPath(firstName);
    const sanitizedLastName = sanitizeForPath(lastName);
    return `${sanitizedFirstName}_${sanitizedLastName}`;
  } else if (email) {
    const emailName = email.split('@')[0];
    return sanitizeForPath(emailName);
  } else {
    return `Dipendente_${userId.substring(0, 8)}`;
  }
};

/**
 * Genera il path virtuale per qualsiasi tipo di operazione
 */
export const generateOperationPath = async (
  operationType: string,
  targetUserId: string,
  date?: Date,
  isCompanyWide: boolean = false
): Promise<string> => {
  const operationDate = date || new Date();
  const year = operationDate.getFullYear().toString();
  const month = (operationDate.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = operationDate.getTime();
  
  // Ottieni il tipo di operazione in italiano
  const operationTypeFolder = OPERATION_TYPE_FOLDER_MAP[operationType] || 'Operazioni_Generiche';
  
  if (isCompanyWide) {
    // Operazioni aziendali
    return `Operazioni_Aziendali/${operationTypeFolder}/${year}/${month}/${timestamp}`;
  }
  
  // Operazioni personali - ottieni i dati del dipendente
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', targetUserId)
      .single();
    
    if (error || !profile) {
      console.warn('Impossibile ottenere il profilo del dipendente, uso fallback UUID');
      return `Dipendente_${targetUserId.substring(0, 8)}/${operationTypeFolder}/${year}/${month}/${timestamp}`;
    }
    
    const employeeFolder = generateEmployeeFolderName(
      profile.first_name,
      profile.last_name,
      profile.email,
      targetUserId
    );
    
    return `${employeeFolder}/${operationTypeFolder}/${year}/${month}/${timestamp}`;
    
  } catch (error) {
    console.error('Errore durante la generazione del path:', error);
    return `Dipendente_${targetUserId.substring(0, 8)}/${operationTypeFolder}/${year}/${month}/${timestamp}`;
  }
};

/**
 * Estrae informazioni dal path di un'operazione
 */
export const parseOperationPath = (path: string) => {
  const parts = path.split('/');
  
  if (parts[0] === 'Operazioni_Aziendali') {
    return {
      isCompanyOperation: true,
      employeeName: null,
      operationType: parts[1],
      year: parts[2],
      month: parts[3],
      timestamp: parts[4]
    };
  } else {
    return {
      isCompanyOperation: false,
      employeeName: parts[0]?.replace(/_/g, ' '),
      operationType: parts[1],
      year: parts[2],
      month: parts[3],
      timestamp: parts[4]
    };
  }
};

/**
 * Genera un ID leggibile per le operazioni
 */
export const generateReadableId = (operationType: string, date: Date, userId: string): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const userSuffix = userId.substring(0, 6).toUpperCase();
  
  const typeCode = {
    'ferie': 'FER',
    'permesso': 'PER',
    'presenza_normale': 'PRE',
    'presenza_manuale': 'MAN',
    'malattia': 'MAL',
    'viaggio_lavoro': 'VIA',
    'notifica_sistema': 'NOT',
    'notifica_admin': 'ADM',
    'messaggio': 'MSG'
  }[operationType] || 'GEN';
  
  return `${typeCode}-${year}${month}${day}-${userSuffix}`;
};

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  user_id: string;
  uploaded_by: string;
  title: string;
  description: string | null;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  file_path: string;
  document_type: 'payslip' | 'transfer' | 'communication' | 'medical_certificate' | 'leave_request' | 'expense_report' | 'contract' | 'other';
  is_personal: boolean;
  created_at: string;
  updated_at: string;
}

// Mappatura dei tipi di documento in italiano per le cartelle
const DOCUMENT_TYPE_FOLDER_MAP: Record<string, string> = {
  'payslip': 'Buste_Paga',
  'transfer': 'Bonifici',
  'communication': 'Comunicazioni',
  'medical_certificate': 'Certificati_Medici',
  'leave_request': 'Richieste_Ferie',
  'expense_report': 'Note_Spese',
  'contract': 'Contratti',
  'other': 'Altri_Documenti',
};

// Funzione per sanitizzare i nomi per il filesystem
const sanitizeForFilesystem = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Rimuove accenti
    .replace(/[^a-zA-Z0-9]/g, '_') // Sostituisce caratteri speciali con underscore
    .replace(/_+/g, '_') // Rimuove underscore multipli
    .replace(/^_|_$/g, ''); // Rimuove underscore all'inizio e alla fine
};

// Funzione per generare il path del file
const generateFilePath = async (
  file: File,
  documentType: Document['document_type'],
  targetUserId: string,
  isPersonalDocument: boolean,
  uploadedBy: string
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
    
    // Crea il nome della cartella dipendente
    let employeeFolder = '';
    if (profile.first_name && profile.last_name) {
      const sanitizedFirstName = sanitizeForFilesystem(profile.first_name);
      const sanitizedLastName = sanitizeForFilesystem(profile.last_name);
      employeeFolder = `${sanitizedFirstName}_${sanitizedLastName}`;
    } else if (profile.email) {
      const emailName = profile.email.split('@')[0];
      employeeFolder = sanitizeForFilesystem(emailName);
    } else {
      employeeFolder = `Dipendente_${targetUserId.substring(0, 8)}`;
    }
    
    return `${employeeFolder}/${documentTypeFolder}/${year}/${month}/${fileName}`;
    
  } catch (error) {
    console.error('Errore durante la generazione del path:', error);
    return `Dipendente_${targetUserId.substring(0, 8)}/${documentTypeFolder}/${year}/${month}/${fileName}`;
  }
};

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, user_id, uploaded_by, title, description, file_name, file_size, file_type, file_path, document_type, is_personal, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i documenti",
          variant: "destructive",
        });
        return;
      }

      const typedDocuments: Document[] = (data || []).map(doc => ({
        ...doc,
        document_type: doc.document_type as Document['document_type']
      }));

      setDocuments(typedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (
    file: File,
    title: string,
    description: string,
    documentType: Document['document_type'],
    targetUserId?: string,
    isPersonalDocument: boolean = true
  ) => {
    if (!user) return { error: 'User not authenticated' };

    const finalTargetUserId = targetUserId || user.id;

    try {
      // Genera il path del file con la nuova struttura
      const filePath = await generateFilePath(
        file,
        documentType,
        finalTargetUserId,
        isPersonalDocument,
        user.id
      );

      console.log('Nuovo path del file:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: isPersonalDocument ? finalTargetUserId : user.id,
          uploaded_by: user.id,
          title,
          description,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_path: filePath,
          document_type: documentType,
          is_personal: isPersonalDocument,
        });

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      toast({
        title: "Successo",
        description: "Documento caricato correttamente",
      });

      await fetchDocuments();
      return { error: null };
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento",
        variant: "destructive",
      });
      return { error };
    }
  };

  const deleteDocument = async (document: Document) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      setLoading(true);

      // Usa la edge function per eliminare il documento
      const { error } = await supabase.functions.invoke('delete-document', {
        body: { documentId: document.id }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Successo",
        description: "Documento eliminato correttamente",
      });

      await fetchDocuments();
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del documento",
        variant: "destructive",
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) {
        throw error;
      }

      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        title: "Errore",
        description: "Impossibile scaricare il documento",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  return {
    documents,
    loading,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    refreshDocuments: fetchDocuments,
  };
};

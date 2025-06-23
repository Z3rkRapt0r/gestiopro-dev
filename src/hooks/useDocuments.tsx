
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

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Ottimizziamo la select: solo campi veramente usati in UI  
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

      // Ensure document_type is properly typed
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
    targetUserId?: string, // ID of the user the document is for, or admin's ID if company doc
    isPersonalDocument: boolean = true // Default to true
  ) => {
    if (!user) return { error: 'User not authenticated' };

    const finalTargetUserId = targetUserId || user.id;
    const fileName = `${Date.now()}_${file.name}`;
    let filePath: string;

    if (isPersonalDocument) {
      filePath = `${finalTargetUserId}/${fileName}`;
    } else {
      // Company document, uploaded by admin (user.id) for all
      // user_id in DB will be uploader's id (user.id), is_personal = false
      filePath = `company_documents/${fileName}`;
    }

    try {
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        // Check if error is because file path already exists (common in dev/testing)
        // Supabase storage might throw an error if the file path is identical.
        // A more robust solution would be to ensure unique file names or handle specific errors.
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: isPersonalDocument ? finalTargetUserId : user.id, // For company docs, user_id is the uploader (admin)
          uploaded_by: user.id, // Always the current authenticated user
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

      await fetchDocuments(); // Refresh the documents list
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

      // Prima elimina il file dallo storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continua comunque con l'eliminazione dal database
      }

      // Poi elimina il record dal database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Successo",
        description: "Documento eliminato correttamente",
      });

      // Aggiorna la lista dei documenti
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
    deleteDocument, // Nuova funzione per eliminare documenti
    refreshDocuments: fetchDocuments,
  };
};

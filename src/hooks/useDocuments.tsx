import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { generateDocumentPath, getEmployeeDisplayName } from '@/utils/documentPathUtils';

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
  // Aggiunti per la gestione dei nomi
  employee_display_name?: string;
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

      // Aggiungi i nomi dei dipendenti per la visualizzazione
      const documentsWithNames = await Promise.all(
        typedDocuments.map(async (doc) => {
          if (doc.is_personal && doc.user_id) {
            const displayName = await getEmployeeDisplayName(doc.user_id);
            return { ...doc, employee_display_name: displayName };
          }
          return doc;
        })
      );

      console.log('Documenti caricati con struttura UUID:', documentsWithNames.length);
      setDocuments(documentsWithNames);
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
      // Usa la nuova struttura con UUID per documenti personali
      const filePath = await generateDocumentPath(
        file,
        documentType,
        finalTargetUserId,
        isPersonalDocument
      );

      console.log('Upload documento con path UUID:', filePath);

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
        description: "Documento caricato con successo",
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

      const { error } = await supabase.functions.invoke('delete-document', {
        body: { documentId: document.id }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Successo",
        description: "Documento eliminato con successo",
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


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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
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

      setDocuments(data || []);
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
    userId?: string
  ) => {
    if (!user) return { error: 'User not authenticated' };

    const targetUserId = userId || user.id;
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${targetUserId}/${fileName}`;

    try {
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: targetUserId,
          uploaded_by: user.id,
          title,
          description,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_path: filePath,
          document_type: documentType,
          is_personal: true,
        });

      if (dbError) {
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

  const downloadDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) {
        throw error;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    refreshDocuments: fetchDocuments,
  };
};

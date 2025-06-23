
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import DocumentUploadForm from './DocumentUploadForm';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface DocumentUploadProps {
  onSuccess?: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  targetUserId?: string;
}

const documentTypes = [
  { value: 'payslip', label: 'Busta Paga' },
  { value: 'transfer', label: 'Bonifico' },
  { value: 'communication', label: 'Comunicazione' },
  { value: 'medical_certificate', label: 'Certificato Medico' },
  { value: 'leave_request', label: 'Richiesta Ferie' },
  { value: 'expense_report', label: 'Nota Spese' },
  { value: 'contract', label: 'Contratto' },
  { value: 'other', label: 'Altro' },
];

const DocumentUpload = ({ onSuccess, open, setOpen, targetUserId }: DocumentUploadProps) => {
  const { profile } = useAuth();
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const isAdmin = profile?.role === 'admin';
  
  const {
    file,
    subject,
    body,
    documentType,
    uploadTarget,
    selectedUserId,
    notifyRecipient,
    loading,
    notificationLoading,
    handleSubjectChange,
    handleFileChange,
    handleDocumentTypeChange,
    handleSubmit,
    resetForm,
    setUploadTarget,
    setSelectedUserId,
    setNotifyRecipient,
    setBody,
  } = useDocumentUpload({ onSuccess, setOpen, targetUserId });

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (isAdmin && open && !targetUserId) {
      const fetchProfiles = async () => {
        const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, email');
        if (error) {
          console.error('Error fetching profiles:', error);
        } else {
          setAllProfiles(data as Profile[]);
        }
      };
      fetchProfiles();
    }
  }, [isAdmin, open, targetUserId]);

  const handleFormSubmit = () => {
    handleSubmit(documentTypes);
  };

  const handleDocumentTypeChangeWrapper = (typeValue: string) => {
    handleDocumentTypeChange(typeValue, documentTypes);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica Nuovo Documento</DialogTitle>
        </DialogHeader>
        <DocumentUploadForm
          file={file}
          subject={subject}
          body={body}
          documentType={documentType}
          uploadTarget={uploadTarget}
          selectedUserId={selectedUserId}
          notifyRecipient={notifyRecipient}
          isAdmin={isAdmin}
          allProfiles={allProfiles}
          targetUserId={targetUserId}
          loading={loading}
          notificationLoading={notificationLoading}
          onFileChange={handleFileChange}
          onSubjectChange={handleSubjectChange}
          onBodyChange={setBody}
          onDocumentTypeChange={handleDocumentTypeChangeWrapper}
          onUploadTargetChange={setUploadTarget}
          onSelectedUserChange={setSelectedUserId}
          onNotifyRecipientChange={setNotifyRecipient}
          onSubmit={handleFormSubmit}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUpload;

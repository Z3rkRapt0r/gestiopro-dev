
import { useState, useEffect } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationForm } from "@/hooks/useNotificationForm";
import { defaultNotificationBody } from '@/components/documents/documentNotificationDefaults';

interface UseDocumentUploadProps {
  onSuccess?: () => void;
  setOpen: (open: boolean) => void;
  targetUserId?: string;
}

export const useDocumentUpload = ({ onSuccess, setOpen, targetUserId }: UseDocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [documentType, setDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'self' | 'specific_user' | 'all_employees'>('self');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notifyRecipient, setNotifyRecipient] = useState(true);
  const [subjectDirty, setSubjectDirty] = useState(false);

  const { uploadDocument } = useDocuments();
  const { user, profile } = useAuth();
  const { sendNotification, loading: notificationLoading } = useNotificationForm();
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (file && !body) {
      setBody(defaultNotificationBody);
    }
  }, [file, body]);

  useEffect(() => {
    if (targetUserId) {
      setUploadTarget('specific_user');
      setSelectedUserId(targetUserId);
    } else {
      setUploadTarget(isAdmin ? 'specific_user' : 'self');
      setSelectedUserId('');
    }
  }, [isAdmin, targetUserId]);

  useEffect(() => {
    setSubjectDirty(false);
  }, [file]);

  const resetForm = () => {
    setFile(null);
    setSubject("");
    setBody("");
    setDocumentType('');
  };

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setSubjectDirty(true);
  };

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setSubjectDirty(false);
    if (!body) {
      setBody(defaultNotificationBody);
    }
  };

  const handleDocumentTypeChange = (typeValue: string, documentTypes: { value: string; label: string }[]) => {
    setDocumentType(typeValue);
    const type = documentTypes.find(dt => dt.value === typeValue);
    if (type) {
      if (!subjectDirty || !subject || documentTypes.some(dt => dt.label === subject)) {
        setSubject(type.label);
        setSubjectDirty(false);
      }
    }
  };

  const handleSubmit = async (documentTypes: { value: string; label: string }[]) => {
    if (!file || !documentType || !user) return;
    if (isAdmin && uploadTarget === 'specific_user' && !selectedUserId) {
      alert("Seleziona un utente specifico.");
      return;
    }
    if (notifyRecipient && (!subject.trim() || !body.trim())) {
      alert("Compila oggetto e messaggio della mail.");
      return;
    }

    setLoading(true);
    console.log('[DocumentUpload] Starting document upload process');

    let targetUserForUpload: string | undefined = user.id;
    let isPersonalDocument = true;

    if (targetUserId) {
      targetUserForUpload = targetUserId;
      isPersonalDocument = true;
    } else if (isAdmin) {
      if (uploadTarget === 'specific_user') {
        targetUserForUpload = selectedUserId;
        isPersonalDocument = true;
      } else if (uploadTarget === 'all_employees') {
        targetUserForUpload = user.id;
        isPersonalDocument = false;
      }
    }

    console.log('[DocumentUpload] Upload configuration:', {
      targetUserForUpload,
      isPersonalDocument,
      uploadTarget,
      notifyRecipient
    });

    const { error } = await uploadDocument(
      file,
      subject,
      "",
      documentType as any,
      targetUserForUpload,
      isPersonalDocument
    );

    if (!error && notifyRecipient) {
      console.log('[DocumentUpload] Document uploaded successfully, sending notification');
      
      // Prepare notification with proper employee email handling
      const notificationPayload: any = {
        subject: subject.trim(),
        shortText: body.trim(),
        topic: "document",
      };

      // Determine who should receive the notification and who is the sender
      if (isPersonalDocument && targetUserForUpload && targetUserForUpload !== user.id) {
        // Employee uploading document for specific admin/user
        notificationPayload.recipientId = targetUserForUpload;
        console.log('[DocumentUpload] Sending notification to specific user:', targetUserForUpload);
      } else if (!isPersonalDocument) {
        // Admin uploading document for all employees
        notificationPayload.recipientId = null;
        console.log('[DocumentUpload] Sending notification to all employees');
      } else if (isPersonalDocument && !isAdmin && profile?.email) {
        // Employee uploading document - notify admin(s)
        notificationPayload.recipientId = null; // Send to all admins
        notificationPayload.employeeEmail = profile.email;
        console.log('[DocumentUpload] Employee uploading document, notifying admins with employee email:', profile.email);
      }

      // Always pass the current user's profile email if available for reply-to purposes
      if (profile?.email && !isAdmin) {
        notificationPayload.employeeEmail = profile.email;
        console.log('[DocumentUpload] Adding employee email for reply-to:', profile.email);
      }

      try {
        await sendNotification(notificationPayload);
        console.log('[DocumentUpload] Notification sent successfully');
      } catch (notificationError) {
        console.error('[DocumentUpload] Error sending notification:', notificationError);
      }
    }

    if (!error) {
      setOpen(false);
      onSuccess?.();
    }
    setLoading(false);
  };

  return {
    // Form state
    file,
    subject,
    body,
    documentType,
    uploadTarget,
    selectedUserId,
    notifyRecipient,
    subjectDirty,
    
    // Loading states
    loading,
    notificationLoading,
    
    // User info
    isAdmin,
    
    // Handlers
    handleSubjectChange,
    handleFileChange,
    handleDocumentTypeChange,
    handleSubmit,
    resetForm,
    
    // Setters
    setUploadTarget,
    setSelectedUserId,
    setNotifyRecipient,
    setBody,
  };
};

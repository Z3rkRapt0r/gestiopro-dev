
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
    console.log('[DocumentUpload] Current user profile:', { 
      id: user.id, 
      email: profile?.email, 
      role: profile?.role,
      isAdmin 
    });

    let targetUserForUpload: string | undefined = user.id;
    let isPersonalDocument = true;
    let shouldNotifyAdmin = false;

    if (targetUserId) {
      // Employee uploading document for specific admin/user (via DocumentUploadDialogController)
      targetUserForUpload = targetUserId;
      isPersonalDocument = true;
      shouldNotifyAdmin = false; // Admin is receiving the document, not being notified
      console.log('[DocumentUpload] Employee uploading for specific admin:', targetUserId);
    } else if (isAdmin) {
      // Admin uploading document
      if (uploadTarget === 'specific_user') {
        targetUserForUpload = selectedUserId;
        isPersonalDocument = true;
        shouldNotifyAdmin = false; // Admin is uploading, doesn't need notification
      } else if (uploadTarget === 'all_employees') {
        targetUserForUpload = user.id;
        isPersonalDocument = false;
        shouldNotifyAdmin = false; // Admin is uploading for all, doesn't need notification
      }
      console.log('[DocumentUpload] Admin uploading, target:', uploadTarget);
    } else {
      // Employee uploading document for themselves
      targetUserForUpload = user.id;
      isPersonalDocument = true;
      shouldNotifyAdmin = true; // Employee uploading should notify admin
      console.log('[DocumentUpload] Employee uploading personal document, will notify admin');
    }

    console.log('[DocumentUpload] Upload configuration:', {
      targetUserForUpload,
      isPersonalDocument,
      uploadTarget,
      notifyRecipient,
      shouldNotifyAdmin,
      employeeEmail: profile?.email
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
      console.log('[DocumentUpload] Document uploaded successfully, preparing notification');
      
      // Prepare notification with proper employee email handling
      const notificationPayload: any = {
        subject: subject.trim(),
        shortText: body.trim(),
        topic: "document",
      };

      // Determine notification routing
      if (targetUserId && !isAdmin) {
        // Employee uploading document for specific admin/user
        notificationPayload.recipientId = targetUserId;
        notificationPayload.employeeEmail = profile?.email;
        console.log('[DocumentUpload] Employee->Admin notification with employee email:', profile?.email);
      } else if (!isPersonalDocument && isAdmin) {
        // Admin uploading document for all employees
        notificationPayload.recipientId = null;
        console.log('[DocumentUpload] Admin->All employees notification');
      } else if (isPersonalDocument && isAdmin && selectedUserId) {
        // Admin uploading document for specific employee
        notificationPayload.recipientId = selectedUserId;
        console.log('[DocumentUpload] Admin->Specific employee notification');
      } else if (shouldNotifyAdmin && !isAdmin && profile?.email) {
        // Employee uploading personal document - notify all admins
        notificationPayload.recipientId = null; // Send to all admins
        notificationPayload.employeeEmail = profile.email;
        console.log('[DocumentUpload] Employee uploading personal document, notifying admins with employee email:', profile.email);
      }

      console.log('[DocumentUpload] Final notification payload:', notificationPayload);

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

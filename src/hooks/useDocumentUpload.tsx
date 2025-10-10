import { useState, useEffect } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationForm } from "@/hooks/useNotificationForm";

interface UseDocumentUploadProps {
  onSuccess?: () => void;
  setOpen: (open: boolean) => void;
  targetUserId?: string;
}

export const useDocumentUpload = ({ onSuccess, setOpen, targetUserId }: UseDocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [body, setBody] = useState("");
  const [documentType, setDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'self' | 'specific_user' | 'all_employees'>('self');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notifyRecipient, setNotifyRecipient] = useState(true);

  const { uploadDocument } = useDocuments();
  const { user, profile } = useAuth();
  const { sendNotification, loading: notificationLoading } = useNotificationForm();
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (targetUserId) {
      setUploadTarget('specific_user');
      setSelectedUserId(targetUserId);
    } else {
      setUploadTarget(isAdmin ? 'specific_user' : 'self');
      setSelectedUserId('');
    }
  }, [isAdmin, targetUserId]);

  const resetForm = () => {
    setFile(null);
    setBody("");
    setDocumentType('');
  };

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
  };

  const handleDocumentTypeChange = (typeValue: string, documentTypes: { value: string; label: string }[]) => {
    setDocumentType(typeValue);
  };

  const handleSubmit = async (documentTypes: { value: string; label: string }[]) => {
    if (!file || !documentType || !user) return;
    if (isAdmin && uploadTarget === 'specific_user' && !selectedUserId) {
      alert("Seleziona un utente specifico.");
      return;
    }

    setLoading(true);
    console.log('[DocumentUpload] Starting document upload process');
    console.log('[DocumentUpload] User profile:', { 
      userId: user.id, 
      isAdmin, 
      email: profile?.email,
      uploadTarget,
      targetUserId,
      selectedUserId 
    });

    // Determine upload configuration
    let targetUserForUpload: string | undefined = user.id;
    let isPersonalDocument = true;
    let shouldNotifyAdmins = false;
    let shouldNotifyEmployee = false;
    let shouldNotifyAllEmployees = false;
    let specificEmployeeToNotify: string | undefined;

    if (!isAdmin) {
      // Employee uploading document - always for themselves, always notify all admins
      targetUserForUpload = user.id;
      isPersonalDocument = true;
      shouldNotifyAdmins = true;
      console.log('[DocumentUpload] Employee uploading personal document - will notify all admins');
    } else if (targetUserId) {
      // Admin uploading for specific target user (used in employee management)
      targetUserForUpload = targetUserId;
      isPersonalDocument = true;
      shouldNotifyEmployee = true;
      specificEmployeeToNotify = targetUserId;
      console.log('[DocumentUpload] Admin uploading for specific target user:', targetUserId);
    } else {
      // Admin uploading - check upload target
      if (uploadTarget === 'specific_user') {
        targetUserForUpload = selectedUserId;
        isPersonalDocument = true;
        shouldNotifyEmployee = true;
        specificEmployeeToNotify = selectedUserId;
        console.log('[DocumentUpload] Admin uploading for specific user:', selectedUserId);
      } else if (uploadTarget === 'all_employees') {
        targetUserForUpload = user.id;
        isPersonalDocument = false;
        shouldNotifyAllEmployees = true;
        console.log('[DocumentUpload] Admin uploading company document');
      } else {
        // Admin uploading for themselves - self
        targetUserForUpload = user.id;
        isPersonalDocument = true;
        console.log('[DocumentUpload] Admin uploading personal document');
      }
    }

    console.log('[DocumentUpload] Final upload configuration:', {
      targetUserForUpload,
      isPersonalDocument,
      shouldNotifyAdmins,
      shouldNotifyEmployee,
      shouldNotifyAllEmployees,
      specificEmployeeToNotify
    });

    // Get document type label for display
    const documentTypeLabel = documentTypes.find(dt => dt.value === documentType)?.label || documentType;

    const { error } = await uploadDocument(
      file,
      documentTypeLabel,
      "",
      documentType as any,
      targetUserForUpload,
      isPersonalDocument
    );

    if (!error && notifyRecipient) {
      console.log('[DocumentUpload] Document uploaded successfully, preparing notification');
      console.log('[DocumentUpload] Admin message (body) to send:', body); // FIXED: Log the body content
      
      // Get employee name for template personalization
      const employeeName = profile?.first_name && profile?.last_name 
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.email || 'Dipendente';

      // FIXED: Prepare notification payload with admin message
      const notificationPayload: any = {
        subject: documentTypeLabel,
        shortText: body.trim() || `Nuovo documento caricato: ${documentTypeLabel}`,
        topic: "document",
        employeeName, // Pass employee name for template personalization
        // FIXED: Pass the admin message correctly
        adminMessage: body.trim(), // This is the admin message that should appear in the email
        emailBody: body.trim(), // Also pass as emailBody for backwards compatibility
      };

      // Determine notification recipients and sender email
      if (shouldNotifyAdmins) {
        // Employee uploading document - notify all admins with employee email for reply-to
        console.log('[DocumentUpload] Notifying all admins - employee document upload');
        notificationPayload.recipientId = null; // Send to all admins
        notificationPayload.employeeEmail = profile?.email; // Include employee email for reply-to
        notificationPayload.employeeNote = body.trim(); // Include employee note for template
        console.log('[DocumentUpload] Including employee email for admin notification:', profile?.email);
        console.log('[DocumentUpload] Including employee note:', body.trim());
      } else if (shouldNotifyEmployee && specificEmployeeToNotify) {
        // Admin uploading document for specific employee
        console.log('[DocumentUpload] Notifying specific employee:', specificEmployeeToNotify);
        console.log('[DocumentUpload] Admin message to send:', body.trim()); // FIXED: Log admin message
        notificationPayload.recipientId = specificEmployeeToNotify;
        // FIXED: Ensure admin message is passed for employee notifications
        notificationPayload.adminMessage = body.trim();
        notificationPayload.emailBody = body.trim();
      } else if (shouldNotifyAllEmployees) {
        // Admin uploading company document for all employees
        console.log('[DocumentUpload] Notifying all employees - company document');
        notificationPayload.recipientId = null; // Send to all employees
        // FIXED: Include admin message for company-wide notifications
        notificationPayload.adminMessage = body.trim();
        notificationPayload.emailBody = body.trim();
      } else {
        // Admin uploading for themselves - no notification needed
        console.log('[DocumentUpload] Admin uploading for themselves - no notification needed');
        setOpen(false);
        onSuccess?.();
        setLoading(false);
        return;
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
    body,
    documentType,
    uploadTarget,
    selectedUserId,
    notifyRecipient,
    
    // Loading states
    loading,
    notificationLoading,
    
    // User info
    isAdmin,
    
    // Handlers
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

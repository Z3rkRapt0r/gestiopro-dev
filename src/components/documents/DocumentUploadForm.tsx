
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Info } from 'lucide-react';
import DocumentRecipientSelector from './DocumentRecipientSelector';
import DocumentTypeSelector from './DocumentTypeSelector';
import { defaultNotificationBody } from './documentNotificationDefaults';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface DocumentUploadFormProps {
  // Form state
  file: File | null;
  subject: string;
  body: string;
  documentType: string;
  uploadTarget: 'self' | 'specific_user' | 'all_employees';
  selectedUserId: string;
  notifyRecipient: boolean;
  
  // User data
  isAdmin: boolean;
  allProfiles: Profile[];
  targetUserId?: string;
  
  // Loading states
  loading: boolean;
  notificationLoading: boolean;
  
  // Handlers
  onFileChange: (file: File | null) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onDocumentTypeChange: (typeValue: string) => void;
  onUploadTargetChange: (target: 'self' | 'specific_user' | 'all_employees') => void;
  onSelectedUserChange: (userId: string) => void;
  onNotifyRecipientChange: (notify: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
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

const DocumentUploadForm: React.FC<DocumentUploadFormProps> = ({
  file,
  subject,
  body,
  documentType,
  uploadTarget,
  selectedUserId,
  notifyRecipient,
  isAdmin,
  allProfiles,
  targetUserId,
  loading,
  notificationLoading,
  onFileChange,
  onSubjectChange,
  onBodyChange,
  onDocumentTypeChange,
  onUploadTargetChange,
  onSelectedUserChange,
  onNotifyRecipientChange,
  onSubmit,
  onCancel,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const isSubmitDisabled = loading ||
    notificationLoading ||
    !file ||
    !documentType ||
    (notifyRecipient && (!subject.trim() || !body.trim())) ||
    (isAdmin && uploadTarget === 'specific_user' && !selectedUserId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Information section for employees */}
      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Il documento sarà inviato agli amministratori</p>
              <p className="text-xs mt-1">Gli amministratori riceveranno una notifica email del caricamento del documento</p>
            </div>
          </div>
        </div>
      )}

      <DocumentRecipientSelector
        isAdmin={isAdmin}
        uploadTarget={uploadTarget}
        setUploadTarget={onUploadTargetChange}
        allProfiles={allProfiles}
        targetUserId={targetUserId}
        selectedUserId={selectedUserId}
        setSelectedUserId={onSelectedUserChange}
      />

      <DocumentTypeSelector
        value={documentType}
        onChange={onDocumentTypeChange}
        documentTypes={documentTypes}
      />

      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <Input
          id="file"
          type="file"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            onFileChange(selectedFile || null);
          }}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">
          {isAdmin 
            ? "Oggetto della mail" 
            : "Oggetto della mail per gli amministratori"
          }
        </Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={isAdmin 
            ? "Oggetto della mail" 
            : "Oggetto della mail per gli amministratori"
          }
          required={notifyRecipient}
          disabled={!notifyRecipient}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">
          {isAdmin 
            ? "Messaggio per il destinatario" 
            : "Messaggio per gli amministratori"
          }
        </Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder={defaultNotificationBody}
          required={notifyRecipient}
          disabled={!notifyRecipient}
          rows={3}
        />
        <div className="text-xs text-muted-foreground">
          Puoi usare HTML per link (esempio: {'<a href="/">Vai alla dashboard</a>'})
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          id="notify"
          type="checkbox"
          checked={notifyRecipient}
          onChange={(e) => onNotifyRecipientChange(e.target.checked)}
          className="border-gray-300 rounded focus:ring-blue-500 h-4 w-4"
        />
        <Label htmlFor="notify" className="cursor-pointer select-none">
          {isAdmin 
            ? "Avvisa il destinatario del caricamento del documento (invia una notifica email)"
            : "Avvisa gli amministratori del caricamento del documento (invia una notifica email)"
          }
        </Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitDisabled}>
          {loading || notificationLoading ? (
            "Caricamento..."
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Carica Documento
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
      </div>
    </form>
  );
};

export default DocumentUploadForm;

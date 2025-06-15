import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationForm } from "@/hooks/useNotificationForm";
import DocumentRecipientSelector from './DocumentRecipientSelector';
import DocumentTypeSelector from './DocumentTypeSelector';
import { defaultNotificationBody, defaultNotificationBodyAzienda } from './documentNotificationDefaults';

// Definizione del tipo Profile
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
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [documentType, setDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { uploadDocument } = useDocuments();
  const { user, profile } = useAuth();

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [uploadTarget, setUploadTarget] = useState<'self' | 'specific_user' | 'all_employees'>('self');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const isAdmin = profile?.role === 'admin';
  const [notifyRecipient, setNotifyRecipient] = useState(true);
  const { sendNotification, loading: notificationLoading } = useNotificationForm();

  // Utilizzato per capire se l'utente ha cambiato subject manualmente
  const [subjectDirty, setSubjectDirty] = useState(false);

  useEffect(() => {
    if (file) {
      // Non aggiornare più il subject con il nome del file!
      if (!body) {
        setBody(defaultNotificationBody);
      }
    }
  }, [file]);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setSubject("");
      setBody("");
      setDocumentType('');
    }
  }, [open]);

  useEffect(() => {
    if (targetUserId) {
      setUploadTarget('specific_user');
      setSelectedUserId(targetUserId);
    } else if (!open) {
      setUploadTarget(isAdmin ? 'specific_user' : 'self');
      setSelectedUserId('');
    }
  }, [open, isAdmin, targetUserId]);

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

  useEffect(() => {
    setSubjectDirty(false);
  }, [file]);

  const handleDocumentTypeChange = (typeValue: string) => {
    setDocumentType(typeValue);
    // Trova label
    const type = documentTypes.find(dt => dt.value === typeValue);
    if (type) {
      if (
        !subjectDirty ||
        !subject ||
        documentTypes.some(dt => dt.label === subject)
      ) {
        setSubject(type.label);
        setSubjectDirty(false);
      }
    }
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value);
    setSubjectDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    const { error } = await uploadDocument(
      file,
      subject,
      "",
      documentType as any,
      targetUserForUpload,
      isPersonalDocument
    );

    if (!error && notifyRecipient) {
      if (isPersonalDocument && targetUserForUpload && targetUserForUpload !== user.id) {
        await sendNotification({
          recipientId: targetUserForUpload,
          subject: subject.trim(),
          shortText: body.trim(),
          topic: "document",
        });
      }
      if (!isPersonalDocument) {
        await sendNotification({
          recipientId: null,
          subject: subject.trim(),
          shortText: body.trim(),
          topic: "document",
        });
      }
    }

    if (!error) {
      setOpen(false);
      onSuccess?.();
    }
    setLoading(false);
  };

  const shouldShowNotifyOption =
    (isAdmin && (uploadTarget === 'specific_user' || targetUserId)) || (!isAdmin);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica Nuovo Documento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DocumentRecipientSelector
            isAdmin={isAdmin}
            uploadTarget={uploadTarget}
            setUploadTarget={setUploadTarget}
            allProfiles={allProfiles}
            targetUserId={targetUserId}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
          />

          <DocumentTypeSelector
            value={documentType}
            onChange={handleDocumentTypeChange}
            documentTypes={documentTypes}
          />

          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                setFile(selectedFile || null);
                setSubjectDirty(false);
                // RIMOSSO: nessun setSubject(selectedFile.name...) qui!
                if (!body) {
                  setBody(defaultNotificationBody);
                }
              }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Oggetto della mail</Label>
            <Input
              id="subject"
              value={subject}
              onChange={handleSubjectChange}
              placeholder="Oggetto della mail"
              required={notifyRecipient}
              disabled={!notifyRecipient}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Messaggio per il destinatario</Label>
            <Textarea
              id="body"
              value={body}
              onChange={e => setBody(e.target.value)}
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
              onChange={e => setNotifyRecipient(e.target.checked)}
              className="border-gray-300 rounded focus:ring-blue-500 h-4 w-4"
            />
            <Label htmlFor="notify" className="cursor-pointer select-none">
              Avvisa il destinatario del caricamento del documento (invia una notifica email)
            </Label>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                loading ||
                notificationLoading ||
                !file ||
                !documentType ||
                (notifyRecipient && (!subject.trim() || !body.trim())) ||
                (isAdmin && uploadTarget === 'specific_user' && !selectedUserId)
              }
            >
              {loading || notificationLoading ? (
                "Caricamento..."
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Carica Documento
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentUpload;

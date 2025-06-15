import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Users, User } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationForm } from "@/hooks/useNotificationForm";

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
  targetUserId?: string; // <-- AGGIUNTO
}

const DocumentUpload = ({ onSuccess, open, setOpen, targetUserId }: DocumentUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState(""); // Oggetto mail (ex-Titolo)
  const [body, setBody] = useState(""); // Corpo messaggio mail (ex-Descrizione)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { uploadDocument } = useDocuments();
  const { user, profile } = useAuth();

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [uploadTarget, setUploadTarget] = useState<'self' | 'specific_user' | 'all_employees'>('self');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const isAdmin = profile?.role === 'admin';

  // Flag notifica ora sempre true di default e sempre visibile
  const [notifyRecipient, setNotifyRecipient] = useState(true);
  const { sendNotification, loading: notificationLoading } = useNotificationForm();
  // NOTA: notifyRecipient parte già true

  useEffect(() => {
    if (file) {
      setSubject(file.name.replace(/\.[^/.]+$/, '')); // Oggetto pre-auto dalla selezione file
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
      setTitle('');
      setDescription('');
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

  const defaultNotificationBody =
    "Gentile utente, è stato caricato un nuovo documento per te. Accedi alla tua area personale per visualizzarlo e scaricarlo.";

  const defaultNotificationBodyAzienda =
    "Gentile collaboratore, è stato caricato un nuovo documento aziendale. Visita la tua area personale per scaricarlo.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !documentType || !user) return;
    if (isAdmin && uploadTarget === 'specific_user' && !selectedUserId) {
      alert("Seleziona un utente specifico.");
      return;
    }
    // Devono essere obbligatori se notifico!
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

    // Upload del documento (usa solo "subject" come titolo documento)
    const { error } = await uploadDocument(
      file,
      subject,
      "", // description non più usata
      documentType as any,
      targetUserForUpload,
      isPersonalDocument
    );

    // Notifica email SOLO SE richiesto
    if (!error && notifyRecipient) {
      // Personal: notifica il destinatario
      if (isPersonalDocument && targetUserForUpload && targetUserForUpload !== user.id) {
        await sendNotification({
          recipientId: targetUserForUpload,
          subject: subject.trim(),
          shortText: body.trim(),
          topic: "document",
        });
      }
      // Aziendale: notifica tutti
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!subject) {
        setSubject(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
      if (!body) {
        setBody(defaultNotificationBody);
      }
    }
  };

  const shouldShowNotifyOption =
    // Opzione disponibile solo in contesti personali (no upload aziendale)
    // Admin: quando target specifico. Utente: sempre
    (isAdmin && (uploadTarget === 'specific_user' || targetUserId)) || (!isAdmin);

  // Utilizzato per capire se l'utente ha cambiato subject manualmente
  const [subjectDirty, setSubjectDirty] = useState(false);

  useEffect(() => {
    // Se il file viene caricato resetta le condizioni per default subject
    setSubjectDirty(false);
  }, [file]);

  const handleDocumentTypeChange = (typeValue: string) => {
    setDocumentType(typeValue);
    // Trova label
    const type = documentTypes.find(dt => dt.value === typeValue);
    if (type) {
      // Imposta l'oggetto della mail solo se non modificato manualmente oppure se era vuoto oppure corrispondeva al vecchio label
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica Nuovo Documento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Se admin e targetUserId NON c'è, mostra selettore destinatario */}
          {isAdmin && !targetUserId && (
            <div className="space-y-2">
              <Label htmlFor="uploadTarget">Destinatario</Label>
              <Select value={uploadTarget} onValueChange={(value) => setUploadTarget(value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona destinatario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific_user">
                    <User className="inline mr-2 h-4 w-4" /> Utente Specifico
                  </SelectItem>
                  <SelectItem value="all_employees">
                    <Users className="inline mr-2 h-4 w-4" /> Tutti i Dipendenti (Aziendale)
                  </SelectItem>
                  <SelectItem value="self">
                    <User className="inline mr-2 h-4 w-4" /> Personale (per me Admin)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Se l’admin è in modalità utente specifico, mostra drop-down. Se c’è targetUserId bloccato, mostra solo dati utente selezionato */}
          {isAdmin && uploadTarget === 'specific_user' && (
            <div className="space-y-2">
              <Label htmlFor="specificUser">Seleziona Utente</Label>
              {targetUserId ? (
                // Mostra solo info dell’utente target, non editabile
                <Input
                  value={allProfiles.find((p) => p.id === targetUserId)
                    ? `${allProfiles.find((p) => p.id === targetUserId)?.first_name || ''} ${allProfiles.find((p) => p.id === targetUserId)?.last_name || ''} (${allProfiles.find((p) => p.id === targetUserId)?.email || ''})`
                    : targetUserId
                  }
                  readOnly
                  disabled
                />
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona un utente" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProfiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} ({p.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Tipo documento - ora PRIMA di file/oggetto! */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo Documento</Label>
            <Select value={documentType} onValueChange={handleDocumentTypeChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona il tipo di documento" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File */}
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                setFile(selectedFile || null);
                setSubjectDirty(false); // File cambia: resetta dirty (lascia subject gestito su tipo doc o filename)
                if (selectedFile && !subject) {
                  setSubject(selectedFile.name.replace(/\.[^/.]+$/, ''));
                }
                if (!body) {
                  setBody(defaultNotificationBody);
                }
              }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt"
              required
            />
          </div>

          {/* Titolo/oggetto (dopo il tipo documento!) */}
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

          {/* Messaggio/descrizione (dopo oggetto, come prima) */}
          <div className="space-y-2">
            <Label htmlFor="body">Messaggio per il destinatario</Label>
            <Textarea
              id="body"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Gentile utente, è stato caricato un nuovo documento per te. Accedi alla tua area personale per visualizzarlo e scaricarlo."
              required={notifyRecipient}
              disabled={!notifyRecipient}
              rows={3}
            />
          </div>

          {/* Checkbox avvisa destinatario: sempre visibile! */}
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

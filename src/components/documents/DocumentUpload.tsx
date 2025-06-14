
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, Users, User } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth'; // To get current user and role
import { supabase } from '@/integrations/supabase/client'; // To fetch profiles for admin

// Definizione del tipo Profile (dovrebbe corrispondere a quello in useAuth o simile)
interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  // Aggiungi altri campi se necessari
}

interface DocumentUploadProps {
  onSuccess?: () => void;
  // Rimuoviamo userId, isAdmin, allProfiles dalle props, li gestiremo internamente o con useAuth
}

const DocumentUpload = ({ onSuccess }: DocumentUploadProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { uploadDocument } = useDocuments();
  const { user, profile } = useAuth(); // Get current user info

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [uploadTarget, setUploadTarget] = useState<'self' | 'specific_user' | 'all_employees'>('self');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin && open) {
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
  }, [isAdmin, open]);

  // Reset state when dialog closes or upload target changes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setTitle('');
      setDescription('');
      setDocumentType('');
      setUploadTarget(isAdmin ? 'specific_user' : 'self'); // Default for admin
      setSelectedUserId('');
    }
  }, [open, isAdmin]);


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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !documentType || !user) return;
    if (isAdmin && uploadTarget === 'specific_user' && !selectedUserId) {
      // Admin selected "specific user" but didn't choose one
      alert("Seleziona un utente specifico."); // Replace with toast later
      return;
    }

    setLoading(true);

    let targetUserIdForUpload: string | undefined = user.id;
    let isPersonalDocument: boolean = true;

    if (isAdmin) {
      if (uploadTarget === 'specific_user') {
        targetUserIdForUpload = selectedUserId;
        isPersonalDocument = true;
      } else if (uploadTarget === 'all_employees') {
        targetUserIdForUpload = user.id; // The document belongs to the company, 'user_id' is the admin uploader
        isPersonalDocument = false;
      }
      // if 'self', it's like a normal user upload but by admin, so personal to admin
    }
    // For non-admin, targetUserIdForUpload remains user.id and isPersonalDocument true

    const { error } = await uploadDocument(
      file,
      title,
      description,
      documentType as any, // Document['document_type']
      targetUserIdForUpload,
      isPersonalDocument
    );

    if (!error) {
      setOpen(false);
      // Resetting state is handled by useEffect on 'open'
      onSuccess?.();
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Carica Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica Nuovo Documento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin && (
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

          {isAdmin && uploadTarget === 'specific_user' && (
            <div className="space-y-2">
              <Label htmlFor="specificUser">Seleziona Utente</Label>
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
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Inserisci il titolo del documento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo Documento</Label>
            <Select value={documentType} onValueChange={setDocumentType} required>
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

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione (opzionale)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aggiungi una descrizione..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={loading || !file || !title || !documentType || (isAdmin && uploadTarget === 'specific_user' && !selectedUserId)}
            >
              {loading ? (
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

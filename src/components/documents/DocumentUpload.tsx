
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';

interface DocumentUploadProps {
  userId?: string;
  onSuccess?: () => void;
}

const DocumentUpload = ({ userId, onSuccess }: DocumentUploadProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { uploadDocument } = useDocuments();

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
    if (!file || !title || !documentType) return;

    setLoading(true);
    const { error } = await uploadDocument(
      file,
      title,
      description,
      documentType as any,
      userId
    );

    if (!error) {
      setOpen(false);
      setFile(null);
      setTitle('');
      setDescription('');
      setDocumentType('');
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
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
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
            <Button type="submit" disabled={loading || !file || !title || !documentType}>
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

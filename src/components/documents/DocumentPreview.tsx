
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Image as ImageIcon } from 'lucide-react';

interface DocumentPreviewProps {
  document: any;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (doc: any) => void;
}

const DocumentPreview = ({ document, isOpen, onClose, onDownload }: DocumentPreviewProps) => {
  const [imageError, setImageError] = useState(false);
  
  const isImage = document?.file_type?.startsWith('image/');
  const isPdf = document?.file_type === 'application/pdf';
  
  const getFileUrl = () => {
    // In una implementazione reale, qui useresti supabase.storage.from('documents').getPublicUrl()
    return document?.file_path || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              {document?.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(document)}
              >
                <Download className="h-4 w-4 mr-2" />
                Scarica
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isImage && !imageError ? (
            <div className="flex justify-center items-center min-h-[400px] bg-gray-50 rounded-lg">
              <img
                src={getFileUrl()}
                alt={document?.title}
                className="max-w-full max-h-[600px] object-contain"
                onError={() => setImageError(true)}
              />
            </div>
          ) : isPdf ? (
            <div className="flex justify-center items-center min-h-[400px] bg-gray-50 rounded-lg">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Anteprima PDF non disponibile</p>
                <Button onClick={() => onDownload(document)}>
                  <Download className="h-4 w-4 mr-2" />
                  Scarica per visualizzare
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center min-h-[400px] bg-gray-50 rounded-lg">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Anteprima non disponibile</p>
                <p className="text-sm text-gray-500 mb-4">
                  Tipo file: {document?.file_type || 'Sconosciuto'}
                </p>
                <Button onClick={() => onDownload(document)}>
                  <Download className="h-4 w-4 mr-2" />
                  Scarica file
                </Button>
              </div>
            </div>
          )}
          
          {document?.description && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Descrizione</h4>
              <p className="text-gray-700">{document.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;

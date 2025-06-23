
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdvancedEmployeeOperations } from '@/hooks/useAdvancedEmployeeOperations';
import { AlertTriangle } from 'lucide-react';

interface ClearUserDataDialogProps {
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDataCleared: () => void;
}

const ClearUserDataDialog = ({ employee, isOpen, onClose, onDataCleared }: ClearUserDataDialogProps) => {
  const { clearUserData, isLoading } = useAdvancedEmployeeOperations();

  const handleClearData = async () => {
    if (!employee) return;

    try {
      const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
      await clearUserData(employee.id, employeeName);
      onDataCleared();
      onClose();
    } catch (error) {
      // L'errore è già gestito nel hook
    }
  };

  if (!employee) return null;

  const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Dipendente';

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Conferma azzeramento dati
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Sei sicuro di voler azzerare tutti i dati di <strong>{employeeName}</strong>?
            </p>
            <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
              <p className="text-sm text-orange-800 font-medium mb-2">
                Questa operazione eliminerà:
              </p>
              <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                <li>Tutti i documenti caricati</li>
                <li>Cronologia presenze</li>
                <li>Richieste di ferie e permessi</li>
                <li>Notifiche</li>
                <li>Viaggi di lavoro</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              <strong>Nota:</strong> L'account utente rimarrà attivo ma tutti i dati associati verranno eliminati definitivamente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearData}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Azzeramento...' : 'Azzera Dati'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ClearUserDataDialog;

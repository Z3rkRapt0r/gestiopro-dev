
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
import { Skull } from 'lucide-react';

interface DeleteUserCompletelyDialogProps {
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onUserDeleted: () => void;
}

const DeleteUserCompletelyDialog = ({ employee, isOpen, onClose, onUserDeleted }: DeleteUserCompletelyDialogProps) => {
  const { deleteUserCompletely, isLoading } = useAdvancedEmployeeOperations();

  const handleDeleteCompletely = async () => {
    if (!employee) return;

    try {
      const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
      await deleteUserCompletely(employee.id, employeeName);
      onUserDeleted();
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
            <Skull className="w-5 h-5 text-red-600" />
            ELIMINAZIONE COMPLETA
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="bg-red-50 p-4 rounded-md border border-red-200">
              <p className="text-red-800 font-bold mb-2">
                ⚠️ ATTENZIONE: OPERAZIONE IRREVERSIBILE
              </p>
              <p className="text-red-700">
                Stai per eliminare completamente <strong>{employeeName}</strong> dal sistema.
              </p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-800 font-medium mb-2">
                Questa operazione eliminerà DEFINITIVAMENTE:
              </p>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>L'account utente</li>
                <li>Tutti i documenti e file</li>
                <li>Cronologia completa delle presenze</li>
                <li>Tutte le richieste di ferie e permessi</li>
                <li>Notifiche e messaggi</li>
                <li>Viaggi di lavoro</li>
                <li>Qualsiasi altro dato associato</li>
              </ul>
            </div>
            
            <p className="text-sm font-bold text-red-600">
              Non sarà possibile recuperare i dati dopo questa operazione.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteCompletely}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Eliminazione...' : 'ELIMINA DEFINITIVAMENTE'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserCompletelyDialog;

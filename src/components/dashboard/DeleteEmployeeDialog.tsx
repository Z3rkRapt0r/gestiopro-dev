
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
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';

interface DeleteEmployeeDialogProps {
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onEmployeeDeleted: () => void;
}

const DeleteEmployeeDialog = ({ employee, isOpen, onClose, onEmployeeDeleted }: DeleteEmployeeDialogProps) => {
  const { deleteEmployee, loading } = useEmployeeOperations();

  const handleDelete = async () => {
    if (!employee) return;

    try {
      await deleteEmployee(employee.id);
      onEmployeeDeleted();
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
          <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare il dipendente <strong>{employeeName}</strong>?
            <br />
            <br />
            Questa azione rimuoverà completamente il dipendente dal sistema e non può essere annullata.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Eliminazione...' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEmployeeDialog;

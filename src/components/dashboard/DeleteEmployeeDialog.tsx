
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
  const { deleteEmployee, isLoading } = useEmployeeOperations();

  const handleDelete = async () => {
    if (!employee) return;

    try {
      const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
      await deleteEmployee(employee.id, employeeName);
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
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Eliminazione...' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEmployeeDialog;

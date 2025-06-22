
import React from 'react';
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
import { Loader2 } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface DeleteEmployeeDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (employeeId: string, employeeName: string) => Promise<boolean>;
  isDeleting: boolean;
}

const DeleteEmployeeDialog: React.FC<DeleteEmployeeDialogProps> = ({
  employee,
  isOpen,
  onClose,
  onConfirm,
  isDeleting
}) => {
  if (!employee) return null;

  const employeeName = employee.first_name && employee.last_name
    ? `${employee.first_name} ${employee.last_name}`
    : employee.email || 'Dipendente sconosciuto';

  const handleConfirm = async () => {
    const success = await onConfirm(employee.id, employeeName);
    if (success) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare <strong>{employeeName}</strong>?
            <br /><br />
            <span className="text-red-600 font-medium">
              Questa azione è irreversibile e eliminerà:
            </span>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>Il profilo del dipendente</li>
              <li>Tutti i documenti associati</li>
              <li>Le presenze e i permessi</li>
              <li>Le notifiche e i messaggi</li>
              <li>L'account di accesso</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminazione...
              </>
            ) : (
              'Elimina definitivamente'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteEmployeeDialog;

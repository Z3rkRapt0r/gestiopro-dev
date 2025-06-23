
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAdvancedEmployeeOperations } from '@/hooks/useAdvancedEmployeeOperations';
import { HardDrive, Users, Loader2 } from 'lucide-react';

interface UserStorageStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserStorageStatsDialog = ({ isOpen, onClose }: UserStorageStatsDialogProps) => {
  const { getAllUsersStorageStats, isLoading } = useAdvancedEmployeeOperations();
  const [storageStats, setStorageStats] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadStorageStats();
    }
  }, [isOpen]);

  const loadStorageStats = async () => {
    try {
      const stats = await getAllUsersStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Error loading storage stats:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getTotalStorage = () => {
    return storageStats.reduce((total, user) => total + user.storage_usage.total_size_bytes, 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Statistiche Utilizzo Spazio
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Caricamento statistiche...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Riepilogo totale */}
            <div className="bg-blue-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Riepilogo Totale</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600">Spazio totale occupato</p>
                  <p className="text-lg font-bold text-blue-800">
                    {formatBytes(getTotalStorage())}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabella dettagliata */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dipendente</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Documenti</TableHead>
                    <TableHead className="text-right">Spazio Occupato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storageStats.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : 'Nome non disponibile'
                        }
                      </TableCell>
                      <TableCell>{user.email || 'Email non disponibile'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {user.storage_usage.documents.count} file
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatBytes(user.storage_usage.total_size_bytes)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {storageStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Nessun dato disponibile
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserStorageStatsDialog;

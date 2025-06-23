
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, HardDrive, FileText, Users, Trash2, AlertTriangle } from 'lucide-react';
import { useAdvancedEmployeeOperations } from '@/hooks/useAdvancedEmployeeOperations';

interface UserStorageStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserStorageStatsDialog = ({ isOpen, onClose }: UserStorageStatsDialogProps) => {
  const { getAllUsersStorageStats, isLoading } = useAdvancedEmployeeOperations();
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    const data = await getAllUsersStorageStats();
    setStats(data);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalStorage = stats.reduce((acc, user) => acc + user.storage_usage.total_size_bytes, 0);

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
            Caricamento statistiche...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Totale generale */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Riepilogo Generale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Spazio totale utilizzato</p>
                    <p className="text-2xl font-bold text-blue-600">{formatBytes(totalStorage)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Numero di utenti</p>
                    <p className="text-2xl font-bold text-green-600">{stats.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista utenti */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Dettaglio per Utente</h3>
              {stats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nessun dato disponibile
                </div>
              ) : (
                stats.map((user) => (
                  <Card key={user.user_id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">
                              {user.first_name} {user.last_name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {user.email}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Spazio totale</p>
                              <p className="font-semibold text-blue-600">
                                {formatBytes(user.storage_usage.total_size_bytes)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Documenti</p>
                              <p className="font-semibold">
                                {user.storage_usage.documents.count} file
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Spazio documenti</p>
                              <p className="font-semibold">
                                {formatBytes(user.storage_usage.documents.size_bytes)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {user.storage_usage.total_size_bytes > 10 * 1024 * 1024 && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Elevato
                            </Badge>
                          )}
                          {user.storage_usage.total_size_bytes > 1024 * 1024 && user.storage_usage.total_size_bytes <= 10 * 1024 * 1024 && (
                            <Badge variant="secondary" className="text-xs">
                              Moderato
                            </Badge>
                          )}
                          {user.storage_usage.total_size_bytes <= 1024 * 1024 && (
                            <Badge variant="outline" className="text-xs">
                              Basso
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserStorageStatsDialog;

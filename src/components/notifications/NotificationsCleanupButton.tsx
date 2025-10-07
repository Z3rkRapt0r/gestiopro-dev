import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Trash2, 
  BarChart3, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useNotificationsCleanup } from '@/hooks/useNotificationsCleanup';
import { useToast } from '@/hooks/use-toast';

interface CleanupStats {
  table_name: string;
  retention_days: number;
  is_enabled: boolean;
  last_cleanup_at: string | null;
  last_cleaned_count: number;
  total_records: number;
  old_records_count: number;
}

const NotificationsCleanupButton = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [stats, setStats] = useState<CleanupStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const { loading, getStats, executeCleanup } = useNotificationsCleanup();
  const { toast } = useToast();

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      console.log('[NotificationsCleanupButton] Loading stats...');
      const statsData = await getStats();
      console.log('[NotificationsCleanupButton] Stats loaded:', statsData);
      setStats(statsData);
      // Mostra un riepilogo stile "dry run" direttamente qui
      const totalToDelete = (Array.isArray(statsData) ? statsData : []).reduce((sum, s: any) => sum + (Number(s.old_records_count) || 0), 0);
      if (totalToDelete > 0) {
        toast({
          title: "Simulazione completata",
          description: `Trovati ${totalToDelete} record da eliminare`,
        });
      } else {
        toast({
          title: "Simulazione completata",
          description: "Trovati 0 record da eliminare",
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Rimosso pulsante "Simula Pulizia"; la simulazione ora è inclusa in Aggiorna Statistiche

  const handleCleanup = async () => {
    try {
      await executeCleanup();
      setShowDialog(false);
      // Le statistiche vengono aggiornate automaticamente dalla funzione executeCleanup
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  const safeStats = Array.isArray(stats) ? stats : [];
  const totalOldRecords = safeStats.reduce((sum, stat) => sum + (Number(stat.old_records_count) || 0), 0);
  const totalRecords = safeStats.reduce((sum, stat) => sum + (Number(stat.total_records) || 0), 0);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Mai';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Pulizia Notifiche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Statistiche rapide */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalRecords}</div>
                <div className="text-sm text-gray-600">Totale Notifiche</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{totalOldRecords}</div>
                <div className="text-sm text-gray-600">Da Eliminare</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {totalRecords > 0 ? Math.round(((totalRecords - totalOldRecords) / totalRecords) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Pulizia</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {safeStats.find(s => s.last_cleanup_at) ? '✅' : '❌'}
                </div>
                <div className="text-sm text-gray-600">Ultimo Cleanup</div>
              </div>
            </div>

            {/* Pulsanti azione */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={loadStats}
                disabled={statsLoading}
                variant="outline"
                size="sm"
              >
                {statsLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Aggiorna Statistiche
              </Button>

              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button
                    disabled={loading || totalOldRecords === 0}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Esegui Pulizia
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Conferma Pulizia
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Sei sicuro di voler eliminare <strong>{totalOldRecords} notifiche vecchie</strong>?
                    </p>
                    
                    {safeStats.map((stat) => (
                      stat.old_records_count > 0 && (
                        <div key={stat.table_name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium capitalize">
                              {stat.table_name.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-gray-600">
                              Retention: {stat.retention_days} giorni
                            </div>
                          </div>
                          <Badge variant="destructive">
                            {stat.old_records_count} record
                          </Badge>
                        </div>
                      )
                    ))}

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                        <div className="text-sm">
                          <strong>Attenzione:</strong> Questa operazione non può essere annullata.
                          Le notifiche eliminate non potranno essere recuperate.
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                      disabled={loading}
                    >
                      Annulla
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCleanup}
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Conferma Eliminazione
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Dettagli statistiche */}
            {safeStats.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Dettagli Configurazione</h4>
                {safeStats.map((stat) => (
                  <div key={stat.table_name} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium capitalize">
                        {stat.table_name.replace('_', ' ')}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={stat.is_enabled ? "default" : "secondary"}>
                          {stat.is_enabled ? "Abilitato" : "Disabilitato"}
                        </Badge>
                        <Badge variant="outline">
                          {stat.retention_days} giorni
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Totale:</span> {stat.total_records}
                      </div>
                      <div>
                        <span className="font-medium">Vecchie:</span> {stat.old_records_count}
                      </div>
                      <div>
                        <span className="font-medium">Ultimo cleanup:</span> {formatDate(stat.last_cleanup_at)}
                      </div>
                      <div>
                        <span className="font-medium">Eliminate:</span> {stat.last_cleaned_count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsCleanupButton;


import { useMemo, useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { getNotificationTypeLabel } from "@/utils/notificationUtils";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const SentNotificationsHistory = ({ refreshKey }: { refreshKey?: number }) => {
  const { notifications, loading, refreshNotifications } = useNotifications();
  const { profile } = useAuth();
  const [innerRefreshKey, setInnerRefreshKey] = useState(0);

  // Riguarda ogni volta che refreshKey cambia o viene forzato
  useEffect(() => {
    if (refreshKey !== undefined || innerRefreshKey) {
      refreshNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, innerRefreshKey]);

  const sent = useMemo(
    () =>
      notifications.filter(n => n.created_by === profile?.id),
    [notifications, profile?.id]
  );

  const handleManualRefresh = () => {
    setInnerRefreshKey(k => k + 1);
    toast({ title: "Cronologia aggiornata" });
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Caricamento cronologia notifiche...</div>;
  }

  if (!sent.length) {
    return (
      <div className="flex flex-col items-center py-8 text-gray-400">
        <Button variant="outline" size="sm" onClick={handleManualRefresh}>
          <RotateCcw className="w-4 h-4 mr-2" /> Aggiorna
        </Button>
        <div className="mt-3">Nessuna notifica inviata ancora.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Cronologia notifiche inviate</h2>
        <Button variant="outline" size="icon" onClick={handleManualRefresh} title="Aggiorna cronologia">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titolo</TableHead>
              <TableHead>Messaggio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead>Stato lettura</TableHead>
              <TableHead>Data invio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sent.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">{n.title}</TableCell>
                <TableCell>{n.message}</TableCell>
                <TableCell>
                  <Badge className="bg-blue-100 text-blue-900">{getNotificationTypeLabel(n.type)}</Badge>
                </TableCell>
                <TableCell>
                  {n.user_id === profile?.id ? (
                    <span className="italic text-gray-500">Me stesso</span>
                  ) : n.user_id ? (
                    <span>Dipendente</span>
                  ) : (
                    <span className="italic text-gray-500">Tutti</span>
                  )}
                </TableCell>
                <TableCell>
                  {n.is_read ? (
                    <Badge className="bg-green-100 text-green-700">Letta</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800">Non letta</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(n.created_at).toLocaleString("it-IT")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SentNotificationsHistory;

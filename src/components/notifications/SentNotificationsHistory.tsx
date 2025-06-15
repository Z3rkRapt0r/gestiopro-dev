
import { useMemo } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { getNotificationTypeLabel } from "@/utils/notificationUtils";

const SentNotificationsHistory = () => {
  const { notifications, loading } = useNotifications();
  const { profile } = useAuth();

  // Admin: mostra tutte quelle inviate da me
  // Si assume che created_by === profile.id per notifiche inviate direttamente dall'admin
  const sent = useMemo(
    () =>
      notifications.filter(n => n.created_by === profile?.id),
    [notifications, profile?.id]
  );

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Caricamento cronologia notifiche...</div>;
  }

  if (!sent.length) {
    return <div className="text-gray-400 py-8 text-center">Nessuna notifica inviata ancora.</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Cronologia notifiche inviate</h2>
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

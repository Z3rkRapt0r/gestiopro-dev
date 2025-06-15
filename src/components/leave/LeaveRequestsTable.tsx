
import { Button } from "@/components/ui/button";
import { useLeaveRequests, LeaveRequest } from "@/hooks/useLeaveRequests";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Table, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { useState } from "react";

interface LeaveRequestsTableProps {
  adminMode?: boolean;
}

export default function LeaveRequestsTable({ adminMode }: LeaveRequestsTableProps) {
  const { profile } = useAuth();
  const { leaveRequests, isLoading, updateStatusMutation } = useLeaveRequests();
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateStatusMutation.mutateAsync({ id, status, admin_note: adminNotes[id] || "" });
      toast({ title: status === "approved" ? "Richiesta approvata" : "Richiesta rifiutata" });
      setAdminNotes((prev) => ({ ...prev, [id]: "" }));
    } catch {
      toast({ title: "Errore azione amministratore", variant: "destructive" });
    }
  };

  if (isLoading) return <div>Caricamento richieste...</div>;
  if (!leaveRequests || leaveRequests.length === 0) return <div>Nessuna richiesta trovata.</div>;

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Utente</TableCell>
          <TableCell>Tipo</TableCell>
          <TableCell>Data / Intervallo</TableCell>
          <TableCell>Orario</TableCell>
          <TableCell>Note</TableCell>
          <TableCell>Stato</TableCell>
          {adminMode && <TableCell>Azioni</TableCell>}
          {adminMode && <TableCell>Nota admin</TableCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {leaveRequests.map((req: LeaveRequest) => (
          <TableRow key={req.id}>
            <TableCell>
              {adminMode ? (
                req.profiles?.first_name
                  ? `${req.profiles.first_name} ${req.profiles.last_name}`
                  : req.user_id
              ) : (
                "Io"
              )}
            </TableCell>
            <TableCell>{req.type}</TableCell>
            <TableCell>
              {req.type === "permesso" && req.day}
              {req.type === "ferie" && req.date_from && req.date_to && `${req.date_from} - ${req.date_to}`}
            </TableCell>
            <TableCell>
              {req.type === "permesso" ? `${req.time_from} - ${req.time_to}` : "-"}
            </TableCell>
            <TableCell>
              {req.note}
            </TableCell>
            <TableCell>
              <span className={
                req.status === "pending"
                  ? "text-yellow-600"
                  : req.status === "approved"
                    ? "text-green-700"
                    : "text-red-600"
              }>
                {req.status}
              </span>
            </TableCell>
            {adminMode && (
              <TableCell>
                {req.status === "pending" && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleAction(req.id, "approved")}>Approva</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleAction(req.id, "rejected")}>Rifiuta</Button>
                  </div>
                )}
              </TableCell>
            )}
            {adminMode && (
              <TableCell>
                {req.status === "pending" ? (
                  <input
                    type="text"
                    placeholder="Nota admin..."
                    value={adminNotes[req.id] || ""}
                    onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                    className="border p-1 w-28 text-xs rounded"
                  />
                ) : (
                  req.admin_note
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

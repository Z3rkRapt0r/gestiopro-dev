
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLeaveRequests, LeaveRequest } from "@/hooks/useLeaveRequests";
import { useState } from "react";
import { Edit, Trash, Check } from "lucide-react";

interface LeaveRequestsTableProps {
  adminMode?: boolean;
  leaveRequests?: LeaveRequest[];
  archive?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
}

export default function LeaveRequestsTable({
  adminMode,
  leaveRequests: propLeaveRequests,
  archive = false,
  showEdit = false,
  showDelete = false,
}: LeaveRequestsTableProps) {
  const { profile } = useAuth();
  const { leaveRequests: hookLeaveRequests, isLoading, updateStatusMutation, updateRequestMutation, deleteRequestMutation } = useLeaveRequests();
  const leaveRequests = propLeaveRequests ?? hookLeaveRequests;
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edited, setEdited] = useState<Partial<LeaveRequest>>({});

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateStatusMutation.mutateAsync({ id, status, admin_note: adminNotes[id] || "" });
      toast({ title: status === "approved" ? "Richiesta approvata" : "Richiesta rifiutata" });
      setAdminNotes((prev) => ({ ...prev, [id]: "" }));
    } catch {
      toast({ title: "Errore azione amministratore", variant: "destructive" });
    }
  };

  const handleEdit = (req: LeaveRequest) => {
    setEditingId(req.id);
    setEdited(req);
  };

  const handleEditChange = (field: keyof LeaveRequest, value: any) => {
    setEdited((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditSave = async () => {
    if (!editingId || !edited) return;
    try {
      await updateRequestMutation.mutateAsync({ ...edited, id: editingId });
      toast({ title: "Richiesta aggiornata" });
      setEditingId(null);
    } catch {
      toast({ title: "Errore salvataggio modifica", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Sei sicuro di voler eliminare questa richiesta?")) return;
    try {
      await deleteRequestMutation.mutateAsync({ id });
      toast({ title: "Richiesta eliminata" });
    } catch {
      toast({ title: "Errore eliminazione", variant: "destructive" });
    }
  };

  if (isLoading) return <div>Caricamento richieste...</div>;
  if (!leaveRequests || leaveRequests.length === 0) return <div>Nessuna richiesta trovata.</div>;

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
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
            <TableRow key={req.id} className={req.status === "pending" ? "bg-yellow-50" : req.status === "approved" ? "bg-green-50" : "bg-red-50"}>
              <TableCell>
                {adminMode && req.profiles?.first_name
                  ? `${req.profiles.first_name} ${req.profiles.last_name}`
                  : "Io"
                }
              </TableCell>
              <TableCell>
                <span className={req.type === "ferie" ? "px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs" : "px-2 py-1 rounded bg-violet-100 text-violet-800 text-xs"}>
                  {req.type}
                </span>
              </TableCell>
              <TableCell>
                {editingId === req.id ? (
                  req.type === "permesso"
                    ? <input type="date" value={edited.day ?? ""} onChange={e => handleEditChange("day", e.target.value)} className="border px-1 rounded text-xs" />
                    : (
                        <div className="flex flex-col gap-1">
                          <input type="date" value={edited.date_from ?? ""} onChange={e => handleEditChange("date_from", e.target.value)} className="border px-1 rounded text-xs" />
                          <span className="text-xs text-gray-400 px-1">al</span>
                          <input type="date" value={edited.date_to ?? ""} onChange={e => handleEditChange("date_to", e.target.value)} className="border px-1 rounded text-xs" />
                        </div>
                      )
                ) : (
                  req.type === "permesso" && req.day
                    ? req.day
                    : req.type === "ferie" && req.date_from && req.date_to
                      ? `${req.date_from} - ${req.date_to}`
                      : "-"
                )}
              </TableCell>
              <TableCell>
                {editingId === req.id && req.type === "permesso"
                  ? (
                      <div className="flex gap-2">
                        <input type="time" value={edited.time_from ?? ""} onChange={e => handleEditChange("time_from", e.target.value)} className="border px-1 rounded text-xs" />
                        <input type="time" value={edited.time_to ?? ""} onChange={e => handleEditChange("time_to", e.target.value)} className="border px-1 rounded text-xs" />
                      </div>
                    )
                  : req.type === "permesso"
                    ? `${req.time_from} - ${req.time_to}`
                    : "-"
                }
              </TableCell>
              <TableCell>
                {editingId === req.id
                  ? <input type="text" value={edited.note ?? ""} onChange={e => handleEditChange("note", e.target.value)} className="border px-1 rounded text-xs" />
                  : req.note
                }
              </TableCell>
              <TableCell>
                <span className={
                  req.status === "pending"
                    ? "inline-block px-2 py-0.5 rounded bg-yellow-200/90 text-yellow-800 text-xs"
                    : req.status === "approved"
                      ? "inline-block px-2 py-0.5 rounded bg-green-200/90 text-green-800 text-xs"
                      : "inline-block px-2 py-0.5 rounded bg-red-200/80 text-red-800 text-xs"
                }>
                  {req.status}
                </span>
              </TableCell>
              {adminMode && (
                <TableCell>
                  {/* Actions */}
                  {editingId === req.id ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-green-100 border-green-300 text-green-800"
                        onClick={handleEditSave}
                        title="Salva"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        title="Annulla"
                      >
                        Annulla
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      {req.status === "pending" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleAction(req.id, "approved")}>Approva</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleAction(req.id, "rejected")}>Rifiuta</Button>
                        </>
                      )}
                      {showEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(req)}
                          title="Modifica"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {showDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(req.id)}
                          title="Elimina"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </TableCell>
              )}
              {adminMode && (
                <TableCell>
                  {editingId === req.id
                    ? <input type="text" value={edited.admin_note ?? ""} onChange={e => handleEditChange("admin_note", e.target.value)} className="border px-1 rounded text-xs" />
                    : req.status === "pending"
                      ? <input
                          type="text"
                          placeholder="Nota admin..."
                          value={adminNotes[req.id] || ""}
                          onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="border p-1 w-28 text-xs rounded"
                        />
                      : req.admin_note
                  }
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

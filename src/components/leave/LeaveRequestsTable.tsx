
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLeaveRequests, LeaveRequest } from "@/hooks/useLeaveRequests";
import { useState } from "react";
import { Edit, Trash, Check, XCircle, User2, Sparkles, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm p-2 sm:p-4">
      <Table className="min-w-[600px]">
        <TableHead>
          <TableRow>
            {adminMode && <TableCell className="font-semibold text-xs w-32">Utente</TableCell>}
            <TableCell className="font-semibold text-xs w-32">Tipo</TableCell>
            <TableCell className="font-semibold text-xs w-40">Data</TableCell>
            <TableCell className="font-semibold text-xs w-28">Stato</TableCell>
            <TableCell className="font-semibold text-xs w-28">Azioni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leaveRequests.map((req: LeaveRequest) => (
            <TableRow
              key={req.id}
              className={`transition-colors ${
                req.status === "pending"
                  ? "bg-yellow-50"
                  : req.status === "approved"
                  ? "bg-green-50"
                  : "bg-red-50"
              } text-xs`}>
              {adminMode && (
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <User2 className="w-4 h-4 text-muted-foreground" />
                    {req.profiles?.first_name
                      ? `${req.profiles.first_name} ${req.profiles.last_name}`
                      : "Io"}
                  </div>
                </TableCell>
              )}
              <TableCell>
                <Badge
                  className={`gap-1 px-2 py-1 rounded text-xs font-medium ${
                    req.type === "ferie"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-violet-100 text-violet-800"
                  } flex items-center w-fit`}
                  variant="secondary"
                >
                  {req.type === "ferie" ? <Sun className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span className="capitalize">{req.type}</span>
                </Badge>
              </TableCell>
              <TableCell>
                {/* Solo visualizzazione o edit campi data */}
                {editingId === req.id ? (
                  req.type === "permesso" ? (
                    <input
                      type="date"
                      value={edited.day ?? ""}
                      onChange={e => handleEditChange("day", e.target.value)}
                      className="border px-1 rounded text-xs w-24"
                    />
                  ) : (
                    <div className="flex flex-col gap-1">
                      <input
                        type="date"
                        value={edited.date_from ?? ""}
                        onChange={e => handleEditChange("date_from", e.target.value)}
                        className="border px-1 rounded text-xs w-24"
                      />
                      <span className="text-xs text-gray-400 px-1 text-center">al</span>
                      <input
                        type="date"
                        value={edited.date_to ?? ""}
                        onChange={e => handleEditChange("date_to", e.target.value)}
                        className="border px-1 rounded text-xs w-24"
                      />
                    </div>
                  )
                ) : req.type === "permesso" && req.day ? (
                  req.day
                ) : req.type === "ferie" && req.date_from && req.date_to ? (
                  <span>{req.date_from}<span className="mx-1">-</span>{req.date_to}</span>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    `gap-1 px-2 py-1 rounded text-xs font-medium flex items-center w-fit ` +
                    (req.status === "pending"
                      ? "bg-yellow-200/90 text-yellow-800"
                      : req.status === "approved"
                      ? "bg-green-200/90 text-green-800"
                      : "bg-red-200/80 text-red-800")
                  }
                  variant="secondary"
                >
                  {req.status === "pending" ? (
                    <Sparkles className="w-3.5 h-3.5" />
                  ) : req.status === "approved" ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span className="capitalize">{req.status}</span>
                </Badge>
              </TableCell>
              <TableCell>
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
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {req.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-green-500 bg-green-50 hover:bg-green-100"
                          onClick={() => handleAction(req.id, "approved")}
                          title="Approva"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-red-400 bg-red-50 hover:bg-red-100"
                          onClick={() => handleAction(req.id, "rejected")}
                          title="Rifiuta"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {showEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(req)}
                        title="Modifica"
                        className="hover:bg-blue-100"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {showDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(req.id)}
                        title="Elimina"
                        className="hover:bg-red-100"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

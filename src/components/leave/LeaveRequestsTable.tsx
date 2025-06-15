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
      <Table className="min-w-[420px] max-w-full">
        <TableHead>
          <TableRow>
            {adminMode && <TableCell className="font-semibold text-xs w-28 px-2 text-center">Utente</TableCell>}
            <TableCell className="font-semibold text-xs w-20 px-2 text-center">Tipo</TableCell>
            <TableCell className="font-semibold text-xs w-32 px-1 text-center">Data</TableCell>
            <TableCell className="font-semibold text-xs w-16 px-1 text-center">Stato</TableCell>
            <TableCell className="font-semibold text-xs w-20 px-2 text-center">Azioni</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leaveRequests.map((req: LeaveRequest) => (
            <TableRow
              key={req.id}
              className={`transition-colors ${req.status === "pending"
                  ? "bg-yellow-50"
                  : req.status === "approved"
                  ? "bg-green-50"
                  : "bg-red-50"
                } text-xs`}
            >
              {adminMode && (
                <TableCell className="whitespace-nowrap px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <User2 className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate max-w-[70px]">{req.profiles?.first_name
                      ? `${req.profiles.first_name} ${req.profiles.last_name}`
                      : "Io"}</span>
                  </div>
                </TableCell>
              )}
              <TableCell className="px-2 py-1 text-center">
                <Badge
                  className={`gap-1 px-1.5 py-0.5 rounded text-xs font-medium min-w-0 mx-auto flex items-center justify-center
                    ${req.type === "ferie"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-violet-100 text-violet-800"
                    }`}
                  variant="secondary"
                >
                  {req.type === "ferie" ? <Sun className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                  <span className="capitalize">{req.type}</span>
                </Badge>
              </TableCell>
              <TableCell className="px-1 py-1 text-center">
                {editingId === req.id ? (
                  req.type === "permesso" ? (
                    <input
                      type="date"
                      value={edited.day ?? ""}
                      onChange={e => handleEditChange("day", e.target.value)}
                      className="border px-1 rounded text-xs w-24 mx-auto block"
                    />
                  ) : (
                    <div className="flex flex-col gap-0.5 items-center">
                      <input
                        type="date"
                        value={edited.date_from ?? ""}
                        onChange={e => handleEditChange("date_from", e.target.value)}
                        className="border px-1 rounded text-xs w-24"
                      />
                      <span className="text-xs text-gray-400 px-0.5 text-center">al</span>
                      <input
                        type="date"
                        value={edited.date_to ?? ""}
                        onChange={e => handleEditChange("date_to", e.target.value)}
                        className="border px-1 rounded text-xs w-24"
                      />
                    </div>
                  )
                ) : req.type === "permesso" && req.day ? (
                  <span>{req.day}</span>
                ) : req.type === "ferie" && req.date_from && req.date_to ? (
                  <span>{req.date_from}<span className="mx-0.5">-</span>{req.date_to}</span>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="px-1 py-1 text-center">
                <Badge
                  className={
                    `gap-1 px-1.5 py-0.5 rounded text-xs font-medium flex items-center justify-center mx-auto min-w-0 ` +
                    (req.status === "pending"
                      ? "bg-yellow-200/90 text-yellow-800"
                      : req.status === "approved"
                      ? "bg-green-200/90 text-green-800"
                      : "bg-red-200/80 text-red-800")
                  }
                  variant="secondary"
                >
                  {req.status === "pending" ? (
                    <Sparkles className="w-3 h-3" />
                  ) : req.status === "approved" ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span className="capitalize">{req.status}</span>
                </Badge>
              </TableCell>
              <TableCell className="px-2 py-1 text-center">
                {editingId === req.id ? (
                  <div className="flex gap-1 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-100 border-green-300 text-green-800 px-2 py-1 h-6 w-6"
                      onClick={handleEditSave}
                      title="Salva"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setEditingId(null)}
                      title="Annulla"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1 justify-center">
                    {req.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-green-500 bg-green-50 hover:bg-green-100 h-6 w-6"
                          onClick={() => handleAction(req.id, "approved")}
                          title="Approva"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-red-400 bg-red-50 hover:bg-red-100 h-6 w-6"
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
                        className="hover:bg-blue-100 h-6 w-6"
                        onClick={() => handleEdit(req)}
                        title="Modifica"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {showDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:bg-red-100 h-6 w-6"
                        onClick={() => handleDelete(req.id)}
                        title="Elimina"
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

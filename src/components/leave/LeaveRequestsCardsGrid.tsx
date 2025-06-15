import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User2, Sun, Sparkles, Check, XCircle, Edit, Trash } from "lucide-react";
import { useState } from "react";
import { useLeaveRequests, LeaveRequest } from "@/hooks/useLeaveRequests";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import EditProfileDialog from "./EditProfileDialog";
import EditLeaveRequestDialog from "./EditLeaveRequestDialog";

interface LeaveRequestsCardsGridProps {
  adminMode?: boolean;
  leaveRequests?: LeaveRequest[];
  archive?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
}

export default function LeaveRequestsCardsGrid({
  adminMode,
  leaveRequests: propLeaveRequests,
  archive = false,
  showEdit = false,
  showDelete = false,
}: LeaveRequestsCardsGridProps) {
  const { leaveRequests: hookLeaveRequests, isLoading, updateStatusMutation, updateRequestMutation, deleteRequestMutation } = useLeaveRequests();
  const leaveRequests = propLeaveRequests ?? hookLeaveRequests;
  const { toast } = useToast();
  const { profile } = useAuth();

  // RIMUOVIAMO editingId (usato solo per vecchia modalita' inline, ora usiamo solo editDialog)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [profileEditData, setProfileEditData] = useState<{
    open: boolean;
    profileId: string;
    first: string;
    last: string;
  }>({ open: false, profileId: "", first: "", last: "" });

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    req: LeaveRequest | null;
    loading: boolean;
  }>({ open: false, req: null, loading: false });

  // Approva/rifiuta admin
  const handleAction = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateStatusMutation.mutateAsync({ id, status, admin_note: adminNotes[id] || "" });
      toast({ title: status === "approved" ? "Richiesta approvata" : "Richiesta rifiutata" });
      setAdminNotes((prev) => ({ ...prev, [id]: "" }));
    } catch {
      toast({ title: "Errore azione amministratore", variant: "destructive" });
    }
  };

  // NUOVA: handler per apertura dialog modifica richiesta
  const openEditDialog = (req: LeaveRequest) => {
    console.log('Apro la modale di modifica per richiesta:', req);
    setEditDialog({ open: true, req, loading: false });
  };

  // Submit modifica
  const submitEditDialog = async (values: Partial<LeaveRequest>) => {
    if (!editDialog.req) return;
    setEditDialog(val => ({ ...val, loading: true }));
    try {
      await updateRequestMutation.mutateAsync({ ...values, id: editDialog.req.id });
      toast({ title: "Richiesta aggiornata!" });
      setEditDialog({ open: false, req: null, loading: false });
    } catch {
      toast({ title: "Errore salvataggio", variant: "destructive" });
      setEditDialog(val => ({ ...val, loading: false }));
    }
  };

  // *** ELIMINA *** con log + fix invalidate query
  const handleDelete = async (id: string) => {
    console.log('Chiamato handleDelete per richiesta:', id);
    if (!window.confirm("Sei sicuro di voler eliminare questa richiesta?")) return;
    try {
      await deleteRequestMutation.mutateAsync({ id });
      toast({ title: "Richiesta eliminata!" });
    } catch {
      toast({ title: "Errore eliminazione", variant: "destructive" });
    }
  };

  if (isLoading)
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Caricamento richieste...
      </div>
    );

  if (!leaveRequests || leaveRequests.length === 0)
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">Nessuna richiesta trovata.</div>
    );

  // --- LOGICA BOTTONI ---
  // MODIFICA: Solo OWNER, solo richieste PENDING e non admin
  const canEdit = (req: LeaveRequest) =>
    profile?.id === req.user_id && req.status === "pending" && !adminMode;

  // ELIMINA: 
  // - archivio: tutte proprie richieste (approved/rejected/pending) si possono eliminare
  // - altrimenti, solo pending proprie richieste, e non adminMode
  const canDelete = (req: LeaveRequest) => {
    if (!profile) return false;
    if (archive && profile.id === req.user_id) return true;
    return !archive && profile.id === req.user_id && req.status === "pending" && !adminMode;
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {leaveRequests.map((req: LeaveRequest) => {
          const isOwn = profile?.id === req.user_id;
          const typeIcon = req.type === "ferie" ? <Sun className="w-4 h-4 text-blue-700" /> : <Sparkles className="w-4 h-4 text-violet-700" />;
          const statusIcon =
            req.status === "pending"
              ? <Sparkles className="w-4 h-4 text-yellow-700" />
              : req.status === "approved"
              ? <Check className="w-4 h-4 text-green-700" />
              : <XCircle className="w-4 h-4 text-red-700" />;
          const statusBg =
            req.status === "pending"
              ? "bg-yellow-100"
              : req.status === "approved"
              ? "bg-green-100"
              : "bg-red-100";
          const fullName =
            req.profiles && (req.profiles.first_name || req.profiles.last_name)
              ? `${req.profiles.first_name ?? ""} ${req.profiles.last_name ?? ""}`.trim()
              : "Non specificato";

          const permessoOrario = req.type === "permesso" && req.time_from && req.time_to
            ? `${req.time_from} - ${req.time_to}`
            : req.type === "permesso" && req.time_from
            ? req.time_from
            : req.type === "permesso" && req.time_to
            ? req.time_to
            : null;

          return (
            <div
              key={req.id}
              className={`relative rounded-xl border shadow hover:shadow-md transition-shadow bg-white flex flex-col gap-2 px-3 py-4 min-h-[160px] ${statusBg}`}
            >
              <div className="flex items-center mb-1 justify-between gap-2">
                <Badge
                  className={`gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center bg-gray-100 ${req.type === "ferie" ? "text-blue-800" : "text-violet-800"}`}
                  variant="secondary"
                >
                  {typeIcon}
                  <span className="capitalize pl-0.5">{req.type}</span>
                </Badge>
                <Badge
                  className={`gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center ${req.status === "pending"
                    ? "bg-yellow-200/90 text-yellow-800"
                    : req.status === "approved"
                    ? "bg-green-200/90 text-green-800"
                    : "bg-red-200/80 text-red-800"
                  }`}
                  variant="secondary"
                >
                  {statusIcon}
                  <span className="capitalize pl-0.5">{req.status}</span>
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1 min-w-[120px]">
                  <span className="truncate font-semibold text-[13px] max-w-[400px]" title={fullName}>
                    {fullName}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[12px] text-muted-foreground">
                    {req.type === "permesso" && req.day
                      ? (
                        <>
                          <span>{req.day}</span>
                          {permessoOrario && <span className="mx-1 text-xs text-blue-900">({permessoOrario})</span>}
                        </>
                      )
                      : req.type === "ferie" && req.date_from && req.date_to
                      ? `${req.date_from} → ${req.date_to}`
                      : "-"}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2 min-h-[20px]">
                {req.note}
              </div>
              {adminMode && req.status === "pending" && (
                <input
                  type="text"
                  placeholder="Note per amministratore..."
                  value={adminNotes[req.id] || ""}
                  onChange={e => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  className="block w-full text-xs border border-gray-300 rounded px-2 py-1 mb-1 focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
              )}
              <div className="flex gap-2 mt-auto justify-end">
                {/* BOTTONI Modifica/Elimina solo se consentiti */}
                {canEdit(req) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-blue-100 h-7 w-7 p-0 flex items-center justify-center"
                    onClick={() => openEditDialog(req)}
                    title="Modifica richiesta"
                    style={{ minWidth: 28, minHeight: 28 }}
                  >
                    {/* icona Modifica */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 0 1 2.828 2.828L11.829 17.828A2 2 0 0 1 9 19H5v-4a2 2 0 0 1 .586-1.414z"></path></svg>
                  </Button>
                )}
                {canDelete(req) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-red-100 h-7 w-7 p-0 flex items-center justify-center"
                    onClick={() => handleDelete(req.id)}
                    title="Elimina richiesta"
                    style={{ minWidth: 28, minHeight: 28 }}
                  >
                    {/* icona Cestino */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3m5 0H6m13 0h-1"></path></svg>
                  </Button>
                )}
                {/* AZIONI ADMIN */}
                {adminMode && (
                  <>
                    {/* Se pending: approva/rifiuta */}
                    {req.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-green-500 bg-green-50 hover:bg-green-100 h-7 w-7 p-0 flex items-center justify-center"
                          onClick={() => handleAction(req.id, "approved")}
                          title="Approva"
                          style={{ minWidth: 28, minHeight: 28 }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-red-400 bg-red-50 hover:bg-red-100 h-7 w-7 p-0 flex items-center justify-center"
                          onClick={() => handleAction(req.id, "rejected")}
                          title="Rifiuta"
                          style={{ minWidth: 28, minHeight: 28 }}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {/* Se approved o rejected: Riporta a pendente */}
                    {(req.status === "approved" || req.status === "rejected") && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-yellow-400 bg-yellow-50 hover:bg-yellow-100 h-7 w-7 p-0 flex items-center justify-center"
                        onClick={() => handleAction(req.id, "pending")}
                        title="Riporta a pendente"
                        style={{ minWidth: 28, minHeight: 28 }}
                      >
                        {/* Icona "pending": Sparkles */}
                        <Sparkles className="w-4 h-4 text-yellow-700" />
                      </Button>
                    )}
                    {showEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:bg-blue-100 h-7 w-7 p-0 flex items-center justify-center"
                        onClick={() => openEditDialog(req)}
                        title="Modifica"
                        style={{ minWidth: 28, minHeight: 28 }}
                      >
                        {/* icona Modifica */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 0 1 2.828 2.828L11.829 17.828A2 2 0 0 1 9 19H5v-4a2 2 0 0 1 .586-1.414z"></path></svg>
                      </Button>
                    )}
                    {showDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:bg-red-100 h-7 w-7 p-0 flex items-center justify-center"
                        onClick={() => handleDelete(req.id)}
                        title="Elimina"
                        style={{ minWidth: 28, minHeight: 28 }}
                      >
                        {/* icona Cestino */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3m5 0H6m13 0h-1"></path></svg>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Dialog modifica dipendente su propria richiesta */}
      <EditLeaveRequestDialog
        open={editDialog.open}
        onOpenChange={open =>
          setEditDialog(val => ({ ...val, open }))
        }
        request={editDialog.req}
        loading={editDialog.loading}
        onSave={submitEditDialog}
      />
      {/* Popup modale di modifica nome/cognome */}
      <EditProfileDialog
        open={profileEditData.open}
        onOpenChange={open =>
          setProfileEditData(val => ({ ...val, open }))
        }
        profileId={profileEditData.profileId}
        initialFirstName={profileEditData.first}
        initialLastName={profileEditData.last}
        onSuccess={(newFirst, newLast) => {
          // Aggiorna i nomi anche in cache (soft update)
          // Meglio ancora, invalidate la query leaveRequests (già fa mutation), qui aggiorniamo subito in UI
          if (hookLeaveRequests) {
            const idx = hookLeaveRequests.findIndex(r => r.user_id === profileEditData.profileId);
            if (idx !== -1) {
              hookLeaveRequests[idx].profiles = {
                ...hookLeaveRequests[idx].profiles,
                first_name: newFirst,
                last_name: newLast,
                email: hookLeaveRequests[idx].profiles?.email ?? "",
              };
            }
          }
        }}
      />
    </>
  );
}

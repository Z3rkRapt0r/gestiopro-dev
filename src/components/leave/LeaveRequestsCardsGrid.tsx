
import { LeaveRequest } from "@/hooks/useLeaveRequests";
import { useState } from "react";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Edit2, Trash2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EditLeaveRequestDialog from "./EditLeaveRequestDialog";
import AdminLeaveRequestActions from "./AdminLeaveRequestActions";

interface LeaveRequestsCardsGridProps {
  adminMode?: boolean;
  leaveRequests?: any[];
  archive?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
}

export default function LeaveRequestsCardsGrid({
  adminMode = false,
  leaveRequests: propRequests,
  archive = false,
  showEdit = false,
  showDelete = false,
}: LeaveRequestsCardsGridProps) {
  const { leaveRequests: hookRequests, isLoading, deleteRequestMutation } = useLeaveRequests();
  const { toast } = useToast();
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const requests = propRequests || hookRequests || [];

  const handleDelete = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa richiesta?")) {
      try {
        await deleteRequestMutation.mutateAsync({ id });
        toast({ title: "Richiesta eliminata con successo" });
      } catch (error) {
        toast({ title: "Errore nell'eliminazione", variant: "destructive" });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="text-xs">In attesa</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500 text-xs">Approvata</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="text-xs">Rifiutata</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("it-IT");
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-2">Caricamento...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-sm sm:text-base">
          {archive ? "Nessuna richiesta approvata" : "Nessuna richiesta trovata"}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => (
        <Card key={request.id} className="relative">
          <CardHeader className="pb-3 sm:pb-4">
            {/* Mobile-first header layout */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg capitalize flex items-center gap-2">
                  {request.type === "permesso" ? 
                    <Clock className="w-4 h-4 flex-shrink-0" /> : 
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                  }
                  <span className="truncate">{request.type}</span>
                </CardTitle>
                <div className="flex-shrink-0">
                  {getStatusBadge(request.status)}
                </div>
              </div>
              
              {adminMode && request.profiles && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {request.profiles.first_name} {request.profiles.last_name}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-3 sm:space-y-4">
            {/* Date/Time information - mobile optimized */}
            <div className="space-y-2">
              {request.type === "permesso" ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{formatDate(request.day)}</span>
                  </div>
                  {request.time_from && request.time_to && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{request.time_from} - {request.time_to}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-xs sm:text-sm">Dal</span>
                    <span className="truncate">{formatDate(request.date_from)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-xs sm:text-sm">Al</span>
                    <span className="truncate">{formatDate(request.date_to)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Notes - mobile optimized */}
            {request.note && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">
                      {request.note}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {request.admin_note && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-blue-700 text-xs sm:text-sm">Note amministratore:</div>
                    <div className="text-blue-600 text-xs sm:text-sm break-words mt-1">
                      {request.admin_note}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer - mobile optimized */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {formatDate(request.created_at)}
              </span>
              
              {(showEdit || showDelete) && (
                <div className="flex gap-2 self-end sm:self-auto">
                  {showEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingRequest(request)}
                      className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="hidden sm:inline ml-2">Modifica</span>
                    </Button>
                  )}
                  {showDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(request.id)}
                      className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline ml-2">Elimina</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Admin actions - mobile optimized */}
            {adminMode && request.status === "pending" && (
              <div className="pt-2 border-t">
                <AdminLeaveRequestActions 
                  request={request} 
                  onUpdate={() => setRefreshKey(prev => prev + 1)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {editingRequest && (
        <EditLeaveRequestDialog
          request={editingRequest}
          open={!!editingRequest}
          onOpenChange={(open) => !open && setEditingRequest(null)}
        />
      )}
    </div>
  );
}

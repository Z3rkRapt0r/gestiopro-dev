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
        return <Badge variant="secondary">In attesa</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-500">Approvata</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rifiutata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("it-IT");
  };

  if (isLoading) {
    return <div className="text-center py-4">Caricamento...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {archive ? "Nessuna richiesta approvata" : "Nessuna richiesta trovata"}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {requests.map((request) => (
        <Card key={request.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg capitalize flex items-center gap-2">
                {request.type === "permesso" ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                {request.type}
              </CardTitle>
              {getStatusBadge(request.status)}
            </div>
            {adminMode && request.profiles && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                {request.profiles.first_name} {request.profiles.last_name}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-3">
            {request.type === "permesso" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(request.day)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{request.time_from} - {request.time_to}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Dal {formatDate(request.date_from)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Al {formatDate(request.date_to)}</span>
                </div>
              </div>
            )}

            {request.note && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 mt-0.5" />
                <span className="text-muted-foreground">{request.note}</span>
              </div>
            )}

            {request.admin_note && (
              <div className="flex items-start gap-2 text-sm p-2 bg-blue-50 rounded">
                <FileText className="w-4 h-4 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-700">Note amministratore:</div>
                  <div className="text-blue-600">{request.admin_note}</div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {formatDate(request.created_at)}
              </span>
              
              <div className="flex gap-1">
                {showEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingRequest(request)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                {showDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(request.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {adminMode && request.status === "pending" && (
              <AdminLeaveRequestActions 
                request={request} 
                onUpdate={() => setRefreshKey(prev => prev + 1)}
              />
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

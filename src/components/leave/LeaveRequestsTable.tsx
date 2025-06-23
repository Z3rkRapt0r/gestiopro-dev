
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Edit2, Trash2, Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useLeaveRequests, LeaveRequest } from "@/hooks/useLeaveRequests";
import { useAuth } from "@/hooks/useAuth";
import { EditLeaveRequestDialog } from "./EditLeaveRequestDialog";

interface LeaveRequestsTableProps {
  searchTerm?: string;
  statusFilter?: string;
  typeFilter?: string;
}

export function LeaveRequestsTable({ searchTerm = "", statusFilter = "all", typeFilter = "all" }: LeaveRequestsTableProps) {
  const { leaveRequests, updateStatusMutation, deleteRequestMutation } = useLeaveRequests();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [editingRequest, setEditingRequest] = React.useState<LeaveRequest | null>(null);
  const [adminNotes, setAdminNotes] = React.useState<{ [key: string]: string }>({});

  if (!leaveRequests) return null;

  const filteredRequests = leaveRequests.filter((request) => {
    const matchesSearch = searchTerm === "" || 
      (request.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (request.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (request.note?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesType = typeFilter === "all" || request.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStatusUpdate = (id: string, status: "approved" | "rejected") => {
    const adminNote = adminNotes[id] || "";
    updateStatusMutation.mutate({ id, status, admin_note: adminNote });
    setAdminNotes(prev => ({ ...prev, [id]: "" }));
  };

  const handleDelete = (request: LeaveRequest) => {
    const canDelete = isAdmin || (request.status === 'pending' && request.user_id === profile?.id);
    
    if (!canDelete) return;

    const confirmMessage = request.status === 'approved' 
      ? `Sei sicuro di voler eliminare questa richiesta approvata? Verranno rimosse anche le presenze associate.`
      : `Sei sicuro di voler eliminare questa richiesta?`;
      
    if (confirm(confirmMessage)) {
      deleteRequestMutation.mutate({ id: request.id, leaveRequest: request });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approvata</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rifiutata</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">In Attesa</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === "ferie" 
      ? <Badge className="bg-blue-100 text-blue-800">Ferie</Badge>
      : <Badge className="bg-purple-100 text-purple-800">Permesso</Badge>;
  };

  if (filteredRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Richieste Ferie e Permessi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Nessuna richiesta trovata con i filtri selezionati
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Richieste Ferie e Permessi ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Dipendente</TableHead>}
                  <TableHead>Tipo</TableHead>
                  <TableHead>Periodo/Data</TableHead>
                  <TableHead>Orario</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data Richiesta</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const canEdit = isAdmin || (request.status === 'pending' && request.user_id === profile?.id);
                  const canDelete = isAdmin || (request.status === 'pending' && request.user_id === profile?.id);
                  
                  return (
                    <TableRow key={request.id}>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {request.profiles?.first_name} {request.profiles?.last_name}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>{getTypeBadge(request.type)}</TableCell>
                      <TableCell>
                        {request.type === "ferie" && request.date_from && request.date_to ? (
                          <div className="text-sm">
                            <div>Dal: {format(new Date(request.date_from), "dd/MM/yyyy", { locale: it })}</div>
                            <div>Al: {format(new Date(request.date_to), "dd/MM/yyyy", { locale: it })}</div>
                          </div>
                        ) : request.day ? (
                          format(new Date(request.day), "dd/MM/yyyy", { locale: it })
                        ) : (
                          "Non specificato"
                        )}
                      </TableCell>
                      <TableCell>
                        {request.time_from && request.time_to ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {request.time_from} - {request.time_to}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Giornata intera</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {request.note ? (
                            <p className="text-sm truncate" title={request.note}>
                              {request.note}
                            </p>
                          ) : (
                            <span className="text-gray-400 text-sm">Nessuna nota</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Admin approval/rejection buttons */}
                          {isAdmin && request.status === "pending" && (
                            <>
                              <div className="flex flex-col gap-2 min-w-0">
                                <Textarea
                                  placeholder="Note admin (opzionale)"
                                  value={adminNotes[request.id] || ""}
                                  onChange={(e) => setAdminNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                                  className="h-8 text-xs resize-none"
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(request.id, "approved")}
                                    className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleStatusUpdate(request.id, "rejected")}
                                    className="h-7 px-2"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Edit button */}
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRequest(request)}
                              className="h-7 px-2"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          )}

                          {/* Delete button - now available for approved requests if admin */}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(request)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingRequest && (
        <EditLeaveRequestDialog
          request={editingRequest}
          isOpen={!!editingRequest}
          onClose={() => setEditingRequest(null)}
        />
      )}
    </>
  );
}

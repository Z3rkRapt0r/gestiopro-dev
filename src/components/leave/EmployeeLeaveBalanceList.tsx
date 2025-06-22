
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEmployeeLeaveBalance } from "@/hooks/useEmployeeLeaveBalance";
import { Trash2, Calendar, Clock, User, Edit, Check, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function EmployeeLeaveBalanceList() {
  const { leaveBalances, isLoading, deleteMutation, upsertMutation, isAdmin } = useEmployeeLeaveBalance();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    vacation_days_total: number;
    permission_hours_total: number;
  }>({ vacation_days_total: 0, permission_hours_total: 0 });

  const handleEdit = (balance: any) => {
    setEditingId(balance.id);
    setEditValues({
      vacation_days_total: balance.vacation_days_total,
      permission_hours_total: balance.permission_hours_total,
    });
  };

  const handleSave = (balance: any) => {
    upsertMutation.mutate({
      user_id: balance.user_id,
      year: balance.year,
      vacation_days_total: editValues.vacation_days_total,
      permission_hours_total: editValues.permission_hours_total,
    });
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ vacation_days_total: 0, permission_hours_total: 0 });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Caricamento bilanci...</div>
        </CardContent>
      </Card>
    );
  }

  if (!leaveBalances || leaveBalances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Bilanci Ferie e Permessi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            Nessun bilancio configurato.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Bilanci Ferie e Permessi ({leaveBalances.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaveBalances.map((balance) => {
            const vacationRemaining = balance.vacation_days_total - balance.vacation_days_used;
            const permissionRemaining = balance.permission_hours_total - balance.permission_hours_used;
            const isEditing = editingId === balance.id;
            
            return (
              <div
                key={balance.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      {balance.profiles?.first_name} {balance.profiles?.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Anno {balance.year}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(balance)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sei sicuro di voler eliminare questo bilancio? Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(balance.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Elimina
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSave(balance)}
                            disabled={upsertMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCancel}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      Ferie
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Assegnate:</span>
                          <Input
                            type="number"
                            min="0"
                            value={editValues.vacation_days_total}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              vacation_days_total: parseInt(e.target.value) || 0
                            }))}
                            className="w-20 h-8"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            Usate: {balance.vacation_days_used}
                          </Badge>
                          <Badge 
                            variant={editValues.vacation_days_total - balance.vacation_days_used > 0 ? "default" : "destructive"}
                          >
                            Rimanenti: {editValues.vacation_days_total - balance.vacation_days_used}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          Assegnate: {balance.vacation_days_total}
                        </Badge>
                        <Badge variant="secondary">
                          Usate: {balance.vacation_days_used}
                        </Badge>
                        <Badge 
                          variant={vacationRemaining > 0 ? "default" : "destructive"}
                        >
                          Rimanenti: {vacationRemaining}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Permessi (ore)
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Assegnate:</span>
                          <Input
                            type="number"
                            min="0"
                            value={editValues.permission_hours_total}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              permission_hours_total: parseInt(e.target.value) || 0
                            }))}
                            className="w-20 h-8"
                          />
                          <span className="text-sm">h</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            Usate: {balance.permission_hours_used}h
                          </Badge>
                          <Badge 
                            variant={editValues.permission_hours_total - balance.permission_hours_used > 0 ? "default" : "destructive"}
                          >
                            Rimanenti: {editValues.permission_hours_total - balance.permission_hours_used}h
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          Assegnate: {balance.permission_hours_total}h
                        </Badge>
                        <Badge variant="secondary">
                          Usate: {balance.permission_hours_used}h
                        </Badge>
                        <Badge 
                          variant={permissionRemaining > 0 ? "default" : "destructive"}
                        >
                          Rimanenti: {permissionRemaining}h
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

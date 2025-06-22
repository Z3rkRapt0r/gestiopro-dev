
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEmployeeLeaveBalance } from "@/hooks/useEmployeeLeaveBalance";
import { Trash2, Calendar, Clock, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export function EmployeeLeaveBalanceList() {
  const { leaveBalances, isLoading, deleteMutation, isAdmin } = useEmployeeLeaveBalance();

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
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4" />
                      Ferie
                    </div>
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
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Permessi (ore)
                    </div>
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

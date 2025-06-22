
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserSelector } from "./UserSelector";
import { VacationDateSelector } from "./VacationDateSelector";
import { PermissionDaySelector } from "./PermissionDaySelector";

interface ManualLeaveEntryFormProps {
  onSuccess?: () => void;
}

export function ManualLeaveEntryForm({ onSuccess }: ManualLeaveEntryFormProps) {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [type, setType] = useState<"ferie" | "permesso">("ferie");
  const [day, setDay] = useState<Date | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const { insertMutation } = useLeaveRequests();
  const { toast } = useToast();
  const { profile } = useAuth();

  React.useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("is_active", true)
          .order("first_name");

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Errore",
          description: "Errore nel caricamento degli utenti",
          variant: "destructive"
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast({
        title: "Errore",
        description: "Seleziona un dipendente",
        variant: "destructive"
      });
      return;
    }

    if (type === "ferie" && (!dateFrom || !dateTo)) {
      toast({
        title: "Errore", 
        description: "Seleziona le date di inizio e fine per le ferie",
        variant: "destructive"
      });
      return;
    }

    if (type === "permesso" && !day) {
      toast({
        title: "Errore",
        description: "Seleziona il giorno per il permesso", 
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        type,
        note: note || "Caricamento manuale da amministratore",
        status: "approved", // Auto-approvata perché inserita dall'admin
        user_id: selectedUser,
      };

      if (type === "permesso") {
        payload.day = day?.toISOString().slice(0, 10);
        if (timeFrom && timeTo) {
          payload.time_from = timeFrom;
          payload.time_to = timeTo;
        }
      }

      if (type === "ferie") {
        payload.date_from = dateFrom?.toISOString().slice(0, 10);
        payload.date_to = dateTo?.toISOString().slice(0, 10);
      }

      await insertMutation.mutateAsync(payload);
      
      toast({
        title: "Successo",
        description: `${type === "ferie" ? "Ferie" : "Permesso"} caricato manualmente con successo`
      });

      // Reset form
      setSelectedUser("");
      setDay(null);
      setDateFrom(null);
      setDateTo(null);
      setTimeFrom("");
      setTimeTo("");
      setNote("");
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating manual leave entry:", error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento manuale",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Caricamento Manuale Ferie/Permessi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <CalendarIcon className="h-4 w-4" />
          <AlertDescription>
            Utilizza questa funzione per caricare manualmente ferie o permessi già utilizzati dai dipendenti.
            Le voci verranno automaticamente approvate e conteggiate nei bilanci.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UserSelector
              selectedUser={selectedUser}
              onUserChange={setSelectedUser}
              users={users}
              loading={loadingUsers}
            />

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(value) => setType(value as "ferie" | "permesso")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ferie">Ferie</SelectItem>
                  <SelectItem value="permesso">Permesso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "ferie" && (
            <VacationDateSelector
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          )}

          {type === "permesso" && (
            <PermissionDaySelector
              day={day}
              timeFrom={timeFrom}
              timeTo={timeTo}
              onDayChange={setDay}
              onTimeFromChange={setTimeFrom}
              onTimeToChange={setTimeTo}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note aggiuntive..."
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Caricamento..." : `Carica ${type}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

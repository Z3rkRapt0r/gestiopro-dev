import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useLeaveRequestNotifications } from "@/hooks/useLeaveRequestNotifications";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Mail } from "lucide-react";

interface AdminLeaveRequestActionsProps {
  request: any;
  onUpdate?: () => void;
}

export default function AdminLeaveRequestActions({ request, onUpdate }: AdminLeaveRequestActionsProps) {
  const [adminNote, setAdminNote] = useState(request.admin_note || "");
  const [notifyEmployee, setNotifyEmployee] = useState(request.notify_employee ?? true);
  const [loading, setLoading] = useState(false);

  const { updateStatusMutation } = useLeaveRequests();
  const { notifyEmployee: sendEmployeeNotification } = useLeaveRequestNotifications();
  const { toast } = useToast();

  const getRequestDetails = () => {
    if (request.type === "permesso") {
      return `Giorno: ${request.day}\nOrario: ${request.time_from} - ${request.time_to}${request.note ? `\nNote dipendente: ${request.note}` : ''}`;
    } else {
      return `Dal: ${request.date_from}\nAl: ${request.date_to}${request.note ? `\nNote dipendente: ${request.note}` : ''}`;
    }
  };

  const handleStatusUpdate = async (status: "approved" | "rejected") => {
    setLoading(true);
    try {
      await updateStatusMutation.mutateAsync({
        id: request.id,
        status,
        admin_note: adminNote,
      });

      // Invia notifica al dipendente se richiesto
      if (notifyEmployee) {
        await sendEmployeeNotification({
          requestId: request.id,
          employeeId: request.user_id,
          status,
          adminNote,
          type: request.type,
          details: getRequestDetails(),
        });
      }

      toast({
        title: `Richiesta ${status === 'approved' ? 'approvata' : 'rifiutata'}`,
        description: notifyEmployee ? "Il dipendente è stato notificato via email" : "Stato aggiornato",
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating request status:', error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento della richiesta",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  if (request.status !== "pending") {
    return null;
  }

  return (
    <div className="space-y-4 mt-4 p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium mb-2">Note amministratore</label>
        <Textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Aggiungi note per il dipendente..."
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Checkbox
          id={`notify-${request.id}`}
          checked={notifyEmployee}
          onCheckedChange={(checked) => setNotifyEmployee(checked === true)}
        />
        <label htmlFor={`notify-${request.id}`} className="text-sm font-medium flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Notifica il dipendente via email
        </label>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => handleStatusUpdate("approved")}
          disabled={loading}
          variant="default"
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-2" />
          Approva
        </Button>
        <Button
          onClick={() => handleStatusUpdate("rejected")}
          disabled={loading}
          variant="destructive"
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Rifiuta
        </Button>
      </div>
    </div>
  );
}

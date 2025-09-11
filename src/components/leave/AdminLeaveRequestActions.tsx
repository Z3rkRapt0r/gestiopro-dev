
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
      // Handle time display for permissions
      const timeInfo = request.time_from && request.time_to 
        ? `${request.time_from} - ${request.time_to}`
        : 'giornata intera';
      return `Giorno: ${request.day}\nOrario: ${timeInfo}${request.note ? `\nNote dipendente: ${request.note}` : ''}`;
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
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
      {/* Admin note textarea - mobile optimized */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Note amministratore</label>
        <Textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Aggiungi note per il dipendente..."
          rows={3}
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Notification checkbox - mobile optimized */}
      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Checkbox
          id={`notify-${request.id}`}
          checked={notifyEmployee}
          onCheckedChange={(checked) => setNotifyEmployee(checked === true)}
          className="mt-0.5 flex-shrink-0"
        />
        <label htmlFor={`notify-${request.id}`} className="text-sm font-medium flex items-start gap-2 min-w-0 flex-1">
          <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="break-words">Notifica il dipendente via email</span>
        </label>
      </div>

      {/* Action buttons - mobile optimized */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          onClick={() => handleStatusUpdate("approved")}
          disabled={loading}
          variant="default"
          className="flex-1 h-11 sm:h-10"
        >
          <Check className="w-4 h-4 mr-2" />
          Approva
        </Button>
        <Button
          onClick={() => handleStatusUpdate("rejected")}
          disabled={loading}
          variant="destructive"
          className="flex-1 h-11 sm:h-10"
        >
          <X className="w-4 h-4 mr-2" />
          Rifiuta
        </Button>
      </div>
    </div>
  );
}

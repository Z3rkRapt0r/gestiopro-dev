
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { User2, Calendar, Clock, Trash2 } from "lucide-react";
import { LeaveRequest, useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useAuth } from "@/hooks/useAuth";
import { format, eachDayOfInterval } from "date-fns";

interface EmployeeLeaveArchiveProps {
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  leaveRequests: LeaveRequest[];
  type: "permesso" | "ferie";
}

export default function EmployeeLeaveArchive({ employee, leaveRequests, type }: EmployeeLeaveArchiveProps) {
  const { profile } = useAuth();
  const { deleteRequestMutation } = useLeaveRequests();
  const isAdmin = profile?.role === "admin";

  const employeeName = employee.first_name && employee.last_name 
    ? `${employee.first_name} ${employee.last_name}` 
    : employee.email || "Dipendente sconosciuto";

  const handleDelete = (request: LeaveRequest) => {
    const confirmMessage = `Sei sicuro di voler eliminare questa richiesta approvata? Verranno rimosse anche le presenze associate.`;
      
    if (confirm(confirmMessage)) {
      deleteRequestMutation.mutate({ id: request.id, leaveRequest: request });
    }
  };

  const getDateDisplay = (req: LeaveRequest) => {
    if (req.type === "permesso" && req.day) {
      const timeRange = [req.time_from, req.time_to].filter(Boolean).join(" - ");
      return (
        <div className="text-sm">
          <div>{req.day}</div>
          {timeRange && <div className="text-xs text-muted-foreground">({timeRange})</div>}
        </div>
      );
    }
    if (req.type === "ferie" && req.date_from && req.date_to) {
      return (
        <div className="text-sm">
          {req.date_from} - {req.date_to}
        </div>
      );
    }
    return <span className="text-sm text-muted-foreground">-</span>;
  };

  return (
    <Card className="mb-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`employee-${employee.id}`} className="border-none">
          <AccordionTrigger className="hover:no-underline px-6 py-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center">
                <User2 className="w-4 h-4 text-blue-600" />
              </div>
              {employeeName}
              <Badge variant="secondary" className="ml-2">
                {leaveRequests.length} {type === "permesso" ? "permessi" : "ferie"}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-2">
              {leaveRequests.map((req) => (
                <div 
                  key={req.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {type === "permesso" ? (
                          <Clock className="w-4 h-4 text-violet-600" />
                        ) : (
                          <Calendar className="w-4 h-4 text-blue-600" />
                        )}
                        {getDateDisplay(req)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {req.note && (
                      <div className="text-xs text-muted-foreground max-w-48 truncate" title={req.note}>
                        "{req.note}"
                      </div>
                    )}
                    <Badge 
                      variant="outline" 
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Approvato
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('it-IT')}
                    </div>
                    
                    {/* Delete button for admins */}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(req)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 ml-2"
                        title="Elimina richiesta approvata"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

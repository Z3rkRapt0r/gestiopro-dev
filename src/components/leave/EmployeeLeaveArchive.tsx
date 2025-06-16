
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User2, Calendar, Clock } from "lucide-react";
import { LeaveRequest } from "@/hooks/useLeaveRequests";

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
  const employeeName = employee.first_name && employee.last_name 
    ? `${employee.first_name} ${employee.last_name}` 
    : employee.email || "Dipendente sconosciuto";

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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center">
            <User2 className="w-4 h-4 text-blue-600" />
          </div>
          {employeeName}
          <Badge variant="secondary" className="ml-auto">
            {leaveRequests.length} {type === "permesso" ? "permessi" : "ferie"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


import React from "react";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function EmployeeLeaveArchiveSection() {
  const { leaveRequests, isLoading } = useLeaveRequests();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Filter approved requests
  const approvedRequests = leaveRequests?.filter(req => req.status === "approved") || [];
  
  // Group by user if admin, or show only current user's requests
  const groupedRequests = isAdmin 
    ? approvedRequests.reduce((groups, request) => {
        const userId = request.user_id;
        if (!groups[userId]) {
          groups[userId] = {
            user: request.profiles || { 
              first_name: null, 
              last_name: null, 
              email: 'Unknown User' 
            },
            requests: []
          };
        }
        groups[userId].requests.push(request);
        return groups;
      }, {} as Record<string, { user: any; requests: any[] }>)
    : { [profile?.id || '']: { 
        user: { 
          first_name: profile?.first_name, 
          last_name: profile?.last_name, 
          email: profile?.email 
        }, 
        requests: approvedRequests.filter(req => req.user_id === profile?.id) 
      }};

  const getDateDisplay = (req: any) => {
    if (req.type === "permesso" && req.day) {
      const timeRange = [req.time_from, req.time_to].filter(Boolean).join(" - ");
      return (
        <div className="text-sm">
          <div className="font-medium">{new Date(req.day).toLocaleDateString('it-IT')}</div>
          {timeRange && <div className="text-xs text-muted-foreground">({timeRange})</div>}
        </div>
      );
    }
    if (req.type === "ferie" && req.date_from && req.date_to) {
      return (
        <div className="text-sm">
          <div className="font-medium">
            {new Date(req.date_from).toLocaleDateString('it-IT')} - {new Date(req.date_to).toLocaleDateString('it-IT')}
          </div>
        </div>
      );
    }
    return <span className="text-sm text-muted-foreground">-</span>;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <h2 className="text-lg sm:text-2xl font-bold">Storico Richieste Approvate</h2>
        <Badge variant="secondary" className="self-start sm:self-auto text-xs">
          {approvedRequests.length} richieste
        </Badge>
      </div>

      {Object.entries(groupedRequests).map(([userId, data]) => {
        const userName = data.user.first_name && data.user.last_name 
          ? `${data.user.first_name} ${data.user.last_name}` 
          : data.user.email || "Dipendente sconosciuto";

        return (
          <Card key={userId}>
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate text-sm sm:text-base">{userName}</span>
                </div>
                <Badge variant="outline" className="self-start sm:self-auto text-xs">
                  {data.requests.length} richieste
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {data.requests.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {/* Mobile layout - stacked */}
                    <div className="space-y-3 sm:hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {req.type === "permesso" ? (
                            <Clock className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          ) : (
                            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                          <Badge 
                            variant="outline" 
                            className="bg-green-50 text-green-700 border-green-200 text-xs"
                          >
                            {req.type === "permesso" ? "Permesso" : "Ferie"}
                          </Badge>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="bg-green-50 text-green-700 border-green-200 text-xs"
                        >
                          Approvato
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {getDateDisplay(req)}
                        
                        {req.note && (
                          <div className="text-xs text-muted-foreground p-2 bg-white rounded border-l-2 border-gray-200">
                            <span className="font-medium">Note:</span> {req.note}
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Richiesta del {new Date(req.created_at).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout - horizontal */}
                    <div className="hidden sm:flex sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {req.type === "permesso" ? (
                            <Clock className="w-4 h-4 text-violet-600" />
                          ) : (
                            <Calendar className="w-4 h-4 text-blue-600" />
                          )}
                          {getDateDisplay(req)}
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
                  </div>
                ))}
                
                {data.requests.length === 0 && (
                  <p className="text-muted-foreground text-center py-8 text-sm">
                    Nessuna richiesta approvata trovata
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {Object.keys(groupedRequests).length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center text-sm">
              Nessuna richiesta approvata trovata
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

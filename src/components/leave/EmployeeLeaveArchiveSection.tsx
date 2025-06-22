
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
          <div>{new Date(req.day).toLocaleDateString('it-IT')}</div>
          {timeRange && <div className="text-xs text-muted-foreground">({timeRange})</div>}
        </div>
      );
    }
    if (req.type === "ferie" && req.date_from && req.date_to) {
      return (
        <div className="text-sm">
          {new Date(req.date_from).toLocaleDateString('it-IT')} - {new Date(req.date_to).toLocaleDateString('it-IT')}
        </div>
      );
    }
    return <span className="text-sm text-muted-foreground">-</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold">Storico Richieste Approvate</h2>
        <Badge variant="secondary">{approvedRequests.length} richieste</Badge>
      </div>

      {Object.entries(groupedRequests).map(([userId, data]) => {
        const userName = data.user.first_name && data.user.last_name 
          ? `${data.user.first_name} ${data.user.last_name}` 
          : data.user.email || "Dipendente sconosciuto";

        return (
          <Card key={userId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {userName}
                <Badge variant="outline">{data.requests.length} richieste</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.requests.map((req) => (
                  <div 
                    key={req.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {req.type === "permesso" ? (
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
                
                {data.requests.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
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
            <p className="text-muted-foreground text-center">
              Nessuna richiesta approvata trovata
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

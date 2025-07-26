import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  User, 
  RefreshCw,
  ArrowRight,
  Umbrella,
  Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface LeaveRequestWithProfile {
  id: string;
  type: 'ferie' | 'permesso' | 'malattia';
  date_from?: string;
  date_to?: string;
  day?: string;
  time_from?: string;
  time_to?: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

const SummaryBoard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [recentLeaveRequests, setRecentLeaveRequests] = useState<LeaveRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const isAdmin = profile?.role === 'admin';

  const handleGoToApprovals = () => {
    navigate('/admin?tab=leave-approvals');
  };

  const fetchRecentData = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      // Fetch only pending leave requests
      const { data: leaveRequestsData, error: leaveRequestsError } = await supabase
        .from('leave_requests')
        .select('id, type, date_from, date_to, day, time_from, time_to, note, status, created_at, user_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (leaveRequestsError) throw leaveRequestsError;

      // Fetch profiles for leave requests
      const leaveRequestUserIds = [...new Set(leaveRequestsData?.map(req => req.user_id) || [])];
      const { data: leaveRequestProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', leaveRequestUserIds);

      // Combine leave requests with profiles
      const leaveRequestsWithProfiles = leaveRequestsData?.map(req => ({
        ...req,
        type: req.type as 'ferie' | 'permesso' | 'malattia',
        status: req.status as 'pending' | 'approved' | 'rejected',
        profiles: leaveRequestProfiles?.find(profile => profile.id === req.user_id)
      })) || [];

      setRecentLeaveRequests(leaveRequestsWithProfiles);
      setLastRefresh(new Date());
      
      toast({
        title: "Dati aggiornati",
        description: "Bacheca riepilogativa aggiornata con successo",
      });
    } catch (error) {
      console.error('Errore nel caricamento dati bacheca:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la bacheca",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carica i dati iniziali
  useEffect(() => {
    fetchRecentData();
  }, []);

  // Setup real-time subscriptions per aggiornamenti automatici
  useEffect(() => {
    if (!isAdmin) return;

    const leaveRequestsChannel = supabase
      .channel('summary-board-leave-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests'
        },
        () => {
          console.log('[SummaryBoard] Leave requests changed, refreshing...');
          setTimeout(fetchRecentData, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leaveRequestsChannel);
    };
  }, [isAdmin]);

  const getLeaveRequestIcon = (type: string) => {
    switch (type) {
      case 'ferie':
        return <Umbrella className="h-4 w-4 text-purple-600" />;
      case 'permesso':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'malattia':
        return <Heart className="h-4 w-4 text-orange-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-xs">In attesa</Badge>;
      case 'approved':
        return <Badge className="bg-green-500 text-white text-xs">Approvata</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Rifiutata</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: it });
  };

  const formatLeaveRequestDate = (request: LeaveRequestWithProfile) => {
    if (request.type === 'permesso') {
      if (request.day) {
        const date = format(new Date(request.day), 'dd/MM/yyyy', { locale: it });
        if (request.time_from && request.time_to) {
          return `${date} dalle ${request.time_from} alle ${request.time_to}`;
        }
        return `${date} - Giornata intera`;
      }
    } else {
      if (request.date_from && request.date_to) {
        return `Dal ${format(new Date(request.date_from), 'dd/MM/yyyy', { locale: it })} al ${format(new Date(request.date_to), 'dd/MM/yyyy', { locale: it })}`;
      }
    }
    return 'Data non specificata';
  };

  const getEmployeeName = (profiles?: any) => {
    if (!profiles) return 'Dipendente sconosciuto';
    const firstName = profiles.first_name || '';
    const lastName = profiles.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Dipendente sconosciuto';
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60 max-w-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Calendar className="h-4 w-4" />
            Richieste in Attesa ({recentLeaveRequests.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {format(lastRefresh, 'HH:mm', { locale: it })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecentData}
              disabled={loading}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {recentLeaveRequests.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nessuna richiesta in attesa</p>
            </div>
          ) : (
            recentLeaveRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getLeaveRequestIcon(request.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-900 text-sm">
                        {request.type === 'ferie' ? 'Ferie' : 
                         request.type === 'permesso' ? 'Permesso' : 'Malattia'}
                      </p>
                      <span className="text-xs text-slate-600">
                        {getEmployeeName(request.profiles)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {formatLeaveRequestDate(request)}
                    </p>
                    {request.note && (
                      <p className="text-xs text-slate-500 mt-1 truncate max-w-xs">
                        "{request.note}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleGoToApprovals}
                    className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    <span className="text-xs">Gestisci</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryBoard; 
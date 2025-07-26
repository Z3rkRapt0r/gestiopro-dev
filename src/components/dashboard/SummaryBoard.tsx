import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  Download, 
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plane,
  Umbrella,
  Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useDocuments } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecentDocument {
  id: string;
  title: string;
  document_type: string;
  created_at: string;
  user_id: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

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
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [recentLeaveRequests, setRecentLeaveRequests] = useState<LeaveRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const isAdmin = profile?.role === 'admin';

  const fetchRecentData = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      // Fetch recent documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('id, title, document_type, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (documentsError) throw documentsError;

      // Fetch recent leave requests
      const { data: leaveRequestsData, error: leaveRequestsError } = await supabase
        .from('leave_requests')
        .select('id, type, date_from, date_to, day, time_from, time_to, note, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (leaveRequestsError) throw leaveRequestsError;

      // Fetch profiles for documents
      const documentUserIds = [...new Set(documentsData?.map(doc => doc.user_id) || [])];
      const { data: documentProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', documentUserIds);

      // Fetch profiles for leave requests
      const leaveRequestUserIds = [...new Set(leaveRequestsData?.map(req => req.user_id) || [])];
      const { data: leaveRequestProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', leaveRequestUserIds);

      // Combine documents with profiles
      const documentsWithProfiles = documentsData?.map(doc => ({
        ...doc,
        profiles: documentProfiles?.find(profile => profile.id === doc.user_id)
      })) || [];

      // Combine leave requests with profiles
      const leaveRequestsWithProfiles = leaveRequestsData?.map(req => ({
        ...req,
        type: req.type as 'ferie' | 'permesso' | 'malattia',
        status: req.status as 'pending' | 'approved' | 'rejected',
        profiles: leaveRequestProfiles?.find(profile => profile.id === req.user_id)
      })) || [];

      setRecentDocuments(documentsWithProfiles);
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

    const documentsChannel = supabase
      .channel('summary-board-documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        () => {
          console.log('[SummaryBoard] Documents changed, refreshing...');
          setTimeout(fetchRecentData, 1000);
        }
      )
      .subscribe();

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
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(leaveRequestsChannel);
    };
  }, [isAdmin]);

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'payslip': 'Busta Paga',
      'transfer': 'Bonifico',
      'communication': 'Comunicazione',
      'medical_certificate': 'Certificato Medico',
      'leave_request': 'Richiesta Ferie',
      'expense_report': 'Nota Spese',
      'contract': 'Contratto',
      'other': 'Altro'
    };
    return labels[type] || type;
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'payslip':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'transfer':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'medical_certificate':
        return <FileText className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

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
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FileText className="h-5 w-5" />
            Bacheca Riepilogativa
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Ultimo aggiornamento: {format(lastRefresh, 'HH:mm:ss', { locale: it })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecentData}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ultimi Documenti ({recentDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Richieste Ferie/Permessi ({recentLeaveRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-4">
            <div className="space-y-3">
              {recentDocuments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>Nessun documento caricato recentemente</p>
                </div>
              ) : (
                recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getDocumentTypeIcon(doc.document_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900 truncate">
                            {doc.title}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {getDocumentTypeLabel(doc.document_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <User className="h-3 w-3" />
                          <span>{getEmployeeName(doc.profiles)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            <div className="space-y-3">
              {recentLeaveRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>Nessuna richiesta recente</p>
                </div>
              ) : (
                recentLeaveRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getLeaveRequestIcon(request.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900">
                            {request.type === 'ferie' ? 'Ferie' : 
                             request.type === 'permesso' ? 'Permesso' : 'Malattia'}
                          </p>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                          <User className="h-3 w-3" />
                          <span>{getEmployeeName(request.profiles)}</span>
                          <span>•</span>
                          <span>{formatDate(request.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-700">
                          {formatLeaveRequestDate(request)}
                        </p>
                        {request.note && (
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            "{request.note}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {request.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SummaryBoard; 
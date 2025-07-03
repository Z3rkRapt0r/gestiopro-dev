import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Eye, Trash2, Calendar } from 'lucide-react';
import { ManualSickLeaveForm } from '@/components/attendance/ManualSickLeaveForm';
import { useSickLeaves } from '@/hooks/useSickLeaves';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdminSickLeavesManagement() {
  const { sickLeaves, isLoading, deleteSickLeave, isDeleting, verifyDates } = useSickLeaves();
  const [verificationResults, setVerificationResults] = useState<Record<string, any>>({});

  const handleVerifyDates = async (sickLeave: any) => {
    try {
      const result = await verifyDates(sickLeave.user_id, sickLeave.start_date, sickLeave.end_date);
      setVerificationResults(prev => ({
        ...prev,
        [sickLeave.id]: result
      }));
    } catch (error) {
      console.error('Errore verifica date:', error);
    }
  };

  const getDaysCount = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Caricamento malattie...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Gestione Malattie</h1>
        <p className="text-muted-foreground">
          Sistema dedicato per la gestione delle malattie con controlli di integrità delle date
        </p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Elenco Malattie</TabsTrigger>
          <TabsTrigger value="add">Registra Nuova Malattia</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Malattie Registrate ({sickLeaves?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!sickLeaves || sickLeaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessuna malattia registrata
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dipendente</TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Giorni</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead>Registrata il</TableHead>
                        <TableHead>Verifica</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sickLeaves.map((sickLeave) => {
                        const verification = verificationResults[sickLeave.id];
                        const daysCount = getDaysCount(sickLeave.start_date, sickLeave.end_date);
                        
                        return (
                          <TableRow key={sickLeave.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {sickLeave.profiles?.first_name} {sickLeave.profiles?.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {sickLeave.profiles?.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div>
                                  {format(new Date(sickLeave.start_date), 'dd/MM/yyyy', { locale: it })}
                                  {sickLeave.start_date !== sickLeave.end_date && (
                                    <span> - {format(new Date(sickLeave.end_date), 'dd/MM/yyyy', { locale: it })}</span>
                                  )}
                                </div>
                                {sickLeave.start_date === sickLeave.end_date && (
                                  <Badge variant="secondary">Singolo giorno</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {daysCount} {daysCount === 1 ? 'giorno' : 'giorni'}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={sickLeave.notes || ''}>
                                {sickLeave.notes || 'Nessuna nota'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(sickLeave.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleVerifyDates(sickLeave)}
                                  className="w-full"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Verifica
                                </Button>
                                {verification && (
                                  <div className="text-xs">
                                    {verification.is_valid ? (
                                      <Badge variant="default" className="text-xs">✅ Valida</Badge>
                                    ) : (
                                      <Badge variant="destructive" className="text-xs">
                                        ❌ Errore: {verification.expected_days} attesi, {verification.actual_days} effettivi
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={isDeleting}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Elimina Malattia</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Sei sicuro di voler eliminare questo periodo di malattia per{' '}
                                      {sickLeave.profiles?.first_name} {sickLeave.profiles?.last_name}?
                                      <br />
                                      <strong>Periodo:</strong> {format(new Date(sickLeave.start_date), 'dd/MM/yyyy')}
                                      {sickLeave.start_date !== sickLeave.end_date && 
                                        ` - ${format(new Date(sickLeave.end_date), 'dd/MM/yyyy')}`
                                      }
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteSickLeave(sickLeave)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Elimina
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Registra Nuova Malattia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ManualSickLeaveForm onSuccess={() => {
                // Reimposta eventuali risultati di verifica precedenti
                setVerificationResults({});
              }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
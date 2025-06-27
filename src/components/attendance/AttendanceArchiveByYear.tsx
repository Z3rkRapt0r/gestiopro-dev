import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User2, Calendar, CheckCircle, Trash2, CalendarDays } from "lucide-react";
import { UnifiedAttendance } from "@/hooks/useUnifiedAttendances";
import { useAttendanceArchive } from "@/hooks/useAttendanceArchive";

interface AttendanceArchiveByYearProps {
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  attendances: UnifiedAttendance[];
}

export default function AttendanceArchiveByYear({
  employee,
  attendances
}: AttendanceArchiveByYearProps) {
  const {
    isAdmin,
    deleteAttendance,
    handleBulkDelete,
    bulkDeleteLoading
  } = useAttendanceArchive();

  const employeeName = employee.first_name && employee.last_name 
    ? `${employee.first_name} ${employee.last_name}` 
    : employee.email || "Dipendente sconosciuto";

  // Funzione per determinare l'anno di una presenza
  const getAttendanceYear = (att: UnifiedAttendance): number => {
    return new Date(att.date).getFullYear();
  };

  // Funzione per determinare il mese di una presenza
  const getAttendanceMonth = (att: UnifiedAttendance): number => {
    return new Date(att.date).getMonth() + 1;
  };

  // Funzione per convertire numero mese in nome italiano
  const getMonthName = (monthNumber: number): string => {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return months[monthNumber - 1] || 'Mese sconosciuto';
  };

  const BulkDeleteButton = ({
    attendances,
    period,
    variant = "outline"
  }: {
    attendances: UnifiedAttendance[];
    period: string;
    variant?: "outline" | "destructive";
  }) => {
    if (!isAdmin || attendances.length === 0) return null;

    const confirmText = `Sei sicuro di voler eliminare tutte le ${attendances.length} presenze di ${period} per ${employeeName}? Questa azione è irreversibile.`;

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            size="sm" 
            variant={variant} 
            title={`Elimina tutte le presenze di ${period}`}
            disabled={bulkDeleteLoading} 
            className="text-red-600 hover:text-red-700 h-6 px-2 ml-2 bg-white"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione massiva</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleBulkDelete(attendances, period)}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina tutto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return (
    <Card className="mb-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`employee-${employee.id}`} className="border-none">
          <AccordionTrigger className="hover:no-underline px-6 py-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <div className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center">
                <User2 className="w-4 h-4 text-green-600" />
              </div>
              {employeeName}
              <Badge variant="secondary" className="ml-2">
                {attendances.length} presenze
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {(() => {
                // Raggruppa le presenze per anno
                const attendancesByYear = attendances.reduce((acc, att) => {
                  const year = new Date(att.date).getFullYear();
                  if (!acc[year]) {
                    acc[year] = [];
                  }
                  acc[year].push(att);
                  return acc;
                }, {} as Record<number, UnifiedAttendance[]>);

                // Ordina gli anni dal più recente al più vecchio
                const sortedYears = Object.keys(attendancesByYear).map(Number).sort((a, b) => b - a);

                return sortedYears.map(year => {
                  const yearAttendances = attendancesByYear[year];
                  return (
                    <div key={year} className="border rounded-lg">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value={`year-${year}`} className="border-none">
                          <AccordionTrigger className="hover:no-underline px-4 py-3">
                            <div className="flex items-center gap-2 text-base font-medium">
                              <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center">
                                <CalendarDays className="w-3 h-3 text-blue-600" />
                              </div>
                              Anno {year}
                              <Badge variant="outline" className="ml-2">
                                {yearAttendances.length} presenze
                              </Badge>
                              <BulkDeleteButton attendances={yearAttendances} period={`${year}`} />
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-3">
                              {(() => {
                                // Raggruppa le presenze per mese
                                const attendancesByMonth = yearAttendances.reduce((acc, att) => {
                                  const month = new Date(att.date).getMonth() + 1;
                                  if (!acc[month]) {
                                    acc[month] = [];
                                  }
                                  acc[month].push(att);
                                  return acc;
                                }, {} as Record<number, UnifiedAttendance[]>);

                                const sortedMonths = Object.keys(attendancesByMonth).map(Number).sort((a, b) => b - a);
                                const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
                                
                                return sortedMonths.map(month => {
                                  const monthAttendances = attendancesByMonth[month];
                                  const monthName = months[month - 1] || 'Mese sconosciuto';
                                  
                                  return (
                                    <div key={month} className="border rounded-md bg-gray-50">
                                      <div className="flex items-center justify-between p-3 bg-gray-100 rounded-t-md">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                          <Calendar className="w-4 h-4 text-orange-600" />
                                          {monthName}
                                          <Badge variant="outline" className="ml-2">
                                            {monthAttendances.length} presenze
                                          </Badge>
                                          <BulkDeleteButton 
                                            attendances={monthAttendances} 
                                            period={`${monthName} ${year}`} 
                                            variant="destructive" 
                                          />
                                        </div>
                                      </div>
                                      <div className="p-3 space-y-2">
                                        {monthAttendances.map(att => (
                                          <div key={att.id} className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                              <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                                  <div className="text-sm">
                                                    <div>{att.date}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                      {att.check_in_time} - {att.check_out_time}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                              {att.notes && (
                                                <div className="text-xs text-muted-foreground max-w-48 truncate" title={att.notes}>
                                                  "{att.notes}"
                                                </div>
                                              )}
                                              <Badge variant="outline" className={
                                                att.is_manual 
                                                  ? "bg-orange-50 text-orange-700 border-orange-200"
                                                  : "bg-green-50 text-green-700 border-green-200"
                                              }>
                                                {att.is_manual ? "Presenza Manuale" : "Presenza Automatica"}
                                              </Badge>
                                              <div className="text-xs text-muted-foreground">
                                                {new Date(att.created_at).toLocaleDateString('it-IT')}
                                              </div>
                                              
                                              {isAdmin && (
                                                <Button 
                                                  size="sm" 
                                                  variant="outline" 
                                                  onClick={() => deleteAttendance(att.id)}
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 ml-2" 
                                                  title="Elimina presenza"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  );
                });
              })()}
              
              {attendances.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessuna presenza trovata per questo dipendente</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

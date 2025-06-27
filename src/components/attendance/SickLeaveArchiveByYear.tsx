
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User2, Calendar, Cross, Trash2, CalendarDays } from "lucide-react";
import { UnifiedAttendance } from "@/hooks/useUnifiedAttendances";
import { useSickLeaveArchive } from "@/hooks/useSickLeaveArchive";

interface SickLeaveArchiveByYearProps {
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  sickLeaves: UnifiedAttendance[];
}

export default function SickLeaveArchiveByYear({
  employee,
  sickLeaves
}: SickLeaveArchiveByYearProps) {
  const {
    isAdmin,
    deleteSickLeave,
    handleBulkDelete,
    bulkDeleteLoading
  } = useSickLeaveArchive();

  const employeeName = employee.first_name && employee.last_name 
    ? `${employee.first_name} ${employee.last_name}` 
    : employee.email || "Dipendente sconosciuto";

  // Funzione per determinare l'anno di una malattia
  const getSickLeaveYear = (sl: UnifiedAttendance): number => {
    return new Date(sl.date).getFullYear();
  };

  // Funzione per determinare il mese di una malattia
  const getSickLeaveMonth = (sl: UnifiedAttendance): number => {
    return new Date(sl.date).getMonth() + 1;
  };

  // Funzione per convertire numero mese in nome italiano
  const getMonthName = (monthNumber: number): string => {
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    return months[monthNumber - 1] || 'Mese sconosciuto';
  };

  // Raggruppa le malattie per anno
  const sickLeavesByYear = sickLeaves.reduce((acc, sl) => {
    const year = getSickLeaveYear(sl);
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(sl);
    return acc;
  }, {} as Record<number, UnifiedAttendance[]>);

  // Raggruppa le malattie per mese
  const groupSickLeavesByMonth = (sickLeaves: UnifiedAttendance[]) => {
    return sickLeaves.reduce((acc, sl) => {
      const month = getSickLeaveMonth(sl);
      if (!acc[month]) {
        acc[month] = [];
      }
      acc[month].push(sl);
      return acc;
    }, {} as Record<number, UnifiedAttendance[]>);
  };

  // Ordina gli anni dal più recente al più vecchio
  const sortedYears = Object.keys(sickLeavesByYear).map(Number).sort((a, b) => b - a);

  const BulkDeleteButton = ({
    sickLeaves,
    period,
    variant = "outline"
  }: {
    sickLeaves: UnifiedAttendance[];
    period: string;
    variant?: "outline" | "destructive";
  }) => {
    if (!isAdmin || sickLeaves.length === 0) return null;

    const confirmText = `Sei sicuro di voler eliminare tutti i ${sickLeaves.length} giorni di malattia di ${period} per ${employeeName}? Questa azione è irreversibile.`;

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            size="sm" 
            variant={variant} 
            title={`Elimina tutte le malattie di ${period}`}
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
              onClick={() => handleBulkDelete(sickLeaves, period)}
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
              <div className="bg-red-100 rounded-full w-8 h-8 flex items-center justify-center">
                <User2 className="w-4 h-4 text-red-600" />
              </div>
              {employeeName}
              <Badge variant="secondary" className="ml-2 bg-red-50 text-red-700 border-red-200">
                {sickLeaves.length} giorni di malattia
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              {sortedYears.map(year => {
                const yearSickLeaves = sickLeavesByYear[year];
                return (
                  <div key={year} className="border rounded-lg">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value={`year-${year}`} className="border-none">
                        <AccordionTrigger className="hover:no-underline px-4 py-3">
                          <div className="flex items-center gap-2 text-base font-medium">
                            <div className="bg-red-100 rounded-full w-6 h-6 flex items-center justify-center">
                              <CalendarDays className="w-3 h-3 text-red-600" />
                            </div>
                            Anno {year}
                            <Badge variant="outline" className="ml-2 border-red-200 text-red-700">
                              {yearSickLeaves.length} giorni
                            </Badge>
                            <BulkDeleteButton sickLeaves={yearSickLeaves} period={`${year}`} />
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-3">
                            {(() => {
                              const sickLeavesByMonth = groupSickLeavesByMonth(yearSickLeaves);
                              const sortedMonths = Object.keys(sickLeavesByMonth).map(Number).sort((a, b) => b - a);
                              return sortedMonths.map(month => {
                                const monthSickLeaves = sickLeavesByMonth[month];
                                const monthName = getMonthName(month);
                                
                                return (
                                  <div key={month} className="border rounded-md bg-red-50">
                                    <div className="flex items-center justify-between p-3 bg-red-100 rounded-t-md">
                                      <div className="flex items-center gap-2 text-sm font-medium">
                                        <Calendar className="w-4 h-4 text-red-600" />
                                        {monthName}
                                        <Badge variant="outline" className="ml-2 border-red-200 text-red-700">
                                          {monthSickLeaves.length} giorni
                                        </Badge>
                                        <BulkDeleteButton 
                                          sickLeaves={monthSickLeaves} 
                                          period={`${monthName} ${year}`} 
                                          variant="destructive" 
                                        />
                                      </div>
                                    </div>
                                    <div className="p-3 space-y-2">
                                      {monthSickLeaves.map(sl => (
                                        <div key={sl.id} className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-red-50 transition-colors">
                                          <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                <Cross className="w-4 h-4 text-red-600" />
                                                <div className="text-sm">
                                                  <div>{sl.date}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    Giorno di malattia
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                            {sl.notes && (
                                              <div className="text-xs text-muted-foreground max-w-48 truncate" title={sl.notes}>
                                                "{sl.notes}"
                                              </div>
                                            )}
                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                              Malattia
                                            </Badge>
                                            <div className="text-xs text-muted-foreground">
                                              {new Date(sl.created_at).toLocaleDateString('it-IT')}
                                            </div>
                                            
                                            {isAdmin && (
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                onClick={() => deleteSickLeave(sl.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 ml-2" 
                                                title="Elimina giorno di malattia"
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
              })}
              
              {sortedYears.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessun giorno di malattia trovato per questo dipendente</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}

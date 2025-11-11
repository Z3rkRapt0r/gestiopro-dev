import React, { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Clock3, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Zap,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

interface OvertimeRecord {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  notes?: string;
  reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  overtime_type?: 'manual' | 'automatic_checkin' | 'automatic_checkout';
  is_automatic?: boolean;
  calculated_minutes?: number;
  approval_status?: 'pending' | 'approved' | 'rejected';
}

interface OvertimeArchiveByYearProps {
  employeeId: string;
  employeeName: string;
  yearData: {
    [month: string]: OvertimeRecord[];
  };
  year: string;
  onDeleteRecord: (id: string) => Promise<boolean>;
  onDeleteByPeriod: (employeeId: string, year?: string, month?: string) => Promise<boolean>;
  isAdmin: boolean;
}

export default function OvertimeArchiveByYear({
  employeeId,
  employeeName,
  yearData,
  year,
  onDeleteRecord,
  onDeleteByPeriod,
  isAdmin
}: OvertimeArchiveByYearProps) {
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const getTotalHoursForYear = () => {
    return Object.values(yearData)
      .flat()
      .reduce((total, record) => total + record.hours, 0);
  };

  const getTotalHoursForMonth = (month: string) => {
    return yearData[month]?.reduce((total, record) => total + record.hours, 0) || 0;
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)} ore`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border">
        <div className="flex items-center gap-3">
          <Clock3 className="w-5 h-5 text-orange-600" />
          <div>
            <span className="font-medium text-orange-900">{year}</span>
            <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
              {formatHours(getTotalHoursForYear())}
            </Badge>
          </div>
        </div>
        
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-100">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                <AlertDialogDescription>
                  Sei sicuro di voler eliminare tutti gli straordinari di {employeeName} per l'anno {year}?
                  Questa azione non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDeleteByPeriod(employeeId, year)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="space-y-2">
        {Object.entries(yearData)
          .sort(([a], [b]) => {
            const monthOrder = [
              'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
            ];
            return monthOrder.indexOf(a) - monthOrder.indexOf(b);
          })
          .map(([month, records]) => (
            <div key={month} className="border rounded-lg">
              <Collapsible>
                <CollapsibleTrigger 
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => toggleMonth(month)}
                >
                  <div className="flex items-center gap-3">
                    {expandedMonths.includes(month) ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="font-medium capitalize">{month}</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      {formatHours(getTotalHoursForMonth(month))}
                    </Badge>
                    <Badge variant="outline" className="text-gray-600">
                      {records.length} {records.length === 1 ? 'record' : 'records'}
                    </Badge>
                  </div>
                  
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler eliminare tutti gli straordinari di {employeeName} per {month} {year}?
                            Questa azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDeleteByPeriod(employeeId, year, month)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="border-t border-gray-200 p-3 space-y-2">
                    {records
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <span className="font-medium">
                                {format(new Date(record.date), 'dd/MM/yyyy', { locale: it })}
                              </span>
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                {formatHours(record.hours)}
                              </Badge>
                              {record.is_automatic ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  Automatico
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  Manuale
                                </Badge>
                              )}
                            </div>
                            {(record.notes || record.reason) && (
                              <div className="flex items-start gap-2 text-sm text-gray-600 mt-2">
                                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{record.reason || record.notes}</span>
                              </div>
                            )}
                            {record.is_automatic && record.calculated_minutes && (
                              <div className="text-xs text-gray-500 mt-1">
                                Calcolato: {record.calculated_minutes} minuti
                              </div>
                            )}
                          </div>
                          
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Sei sicuro di voler eliminare questo straordinario del {format(new Date(record.date), 'dd/MM/yyyy')}?
                                    Questa azione non può essere annullata.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => onDeleteRecord(record.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Elimina
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
      </div>
    </div>
  );
}
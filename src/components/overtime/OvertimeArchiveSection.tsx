import React, { useState } from 'react';
import { Clock3, Users, Archive } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useOvertimeArchive } from '@/hooks/useOvertimeArchive';
import { useAuth } from '@/hooks/useAuth';
import OvertimeArchiveByYear from './OvertimeArchiveByYear';

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

interface OvertimesByEmployee {
  [employeeId: string]: {
    employee_name: string;
    years: {
      [year: string]: {
        [month: string]: OvertimeRecord[];
      };
    };
  };
}

export default function OvertimeArchiveSection() {
  const { overtimesByEmployee, loading, deleteOvertimeRecord, deleteOvertimesByPeriod } = useOvertimeArchive();
  const { profile } = useAuth();
  const [expandedEmployees, setExpandedEmployees] = useState<string[]>([]);

  const isAdmin = profile?.role === 'admin';

  const getTotalEmployeesWithOvertimes = () => {
    return Object.keys(overtimesByEmployee).length;
  };

  const getTotalOvertimeHours = (): number => {
    let total = 0;
    Object.values(overtimesByEmployee).forEach(employee => {
      Object.values(employee.years).forEach(year => {
        Object.values(year).forEach(month => {
          if (Array.isArray(month)) {
            month.forEach(record => {
              total += record.hours || 0;
            });
          }
        });
      });
    });
    return total;
  };

  const getEmployeeTotalHours = (employeeData: OvertimesByEmployee[string]): number => {
    let total = 0;
    Object.values(employeeData.years).forEach(year => {
      Object.values(year).forEach(month => {
        if (Array.isArray(month)) {
          month.forEach(record => {
            total += record.hours || 0;
          });
        }
      });
    });
    return total;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-600" />
            Archivio Straordinari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            Caricamento archivio...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (getTotalEmployeesWithOvertimes() === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-600" />
            Archivio Straordinari
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">
            <Clock3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nessuno straordinario registrato</p>
            <p className="text-sm">Gli straordinari registrati appariranno qui</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-orange-600" />
            Archivio Straordinari
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {getTotalEmployeesWithOvertimes()} dipendenti
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 bg-orange-50 text-orange-700 border-orange-200">
              <Clock3 className="w-3 h-3" />
              {getTotalOvertimeHours().toFixed(1)} ore totali
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" value={expandedEmployees} onValueChange={setExpandedEmployees}>
          {Object.entries(overtimesByEmployee)
            .sort(([, a], [, b]) => a.employee_name.localeCompare(b.employee_name))
            .map(([employeeId, employeeData]) => (
              <AccordionItem key={employeeId} value={employeeId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">{employeeData.employee_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        {getEmployeeTotalHours(employeeData).toFixed(1)} ore
                      </Badge>
                      <Badge variant="outline">
                        {Object.keys(employeeData.years).length} {Object.keys(employeeData.years).length === 1 ? 'anno' : 'anni'}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {Object.entries(employeeData.years)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([year, yearData]) => (
                        <OvertimeArchiveByYear
                          key={year}
                          employeeId={employeeId}
                          employeeName={employeeData.employee_name}
                          yearData={yearData}
                          year={year}
                          onDeleteRecord={deleteOvertimeRecord}
                          onDeleteByPeriod={deleteOvertimesByPeriod}
                          isAdmin={isAdmin}
                        />
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
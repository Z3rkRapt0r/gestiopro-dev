
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  tracking_start_type?: string;
}

interface AbsentEmployeesSectionProps {
  employees: Employee[];
}

export default function AbsentEmployeesSection({ employees }: AbsentEmployeesSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-red-700 text-base mb-3 flex items-center gap-2">
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        Assenti ({employees.length})
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {employees.length > 0 ? (
          employees.map((employee) => (
            <div key={employee.id} className="p-3 bg-red-50 rounded-lg border border-red-200 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">
                  {employee.first_name} {employee.last_name}
                </span>
                <div className="flex gap-1.5">
                  {employee.tracking_start_type === 'from_year_start' && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs px-1.5 py-0.5">
                      Da caricare manualmente
                    </Badge>
                  )}
                  {employee.tracking_start_type === 'from_hire_date' && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs px-1.5 py-0.5">
                      Nuovo dipendente
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">Tutti i dipendenti rilevanti sono giustificati</p>
        )}
      </div>
    </div>
  );
}


import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface LeaveEmployeesSectionProps {
  employees: Employee[];
}

export default function LeaveEmployeesSection({ employees }: LeaveEmployeesSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-purple-700 text-base mb-3 flex items-center gap-2">
        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
        In Ferie ({employees.length})
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {employees.length > 0 ? (
          employees.map((employee) => (
            <div key={employee.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">
                      {employee.first_name} {employee.last_name}
                    </span>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs px-1.5 py-0.5">
                      Ferie
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">Nessun dipendente in ferie</p>
        )}
      </div>
    </div>
  );
}

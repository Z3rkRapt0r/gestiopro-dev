
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  businessTrip?: {
    destination?: string;
    start_date?: string;
    end_date?: string;
    reason?: string;
  };
}

interface BusinessTripEmployeesSectionProps {
  employees: Employee[];
}

export default function BusinessTripEmployeesSection({ 
  employees
}: BusinessTripEmployeesSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-blue-700 text-base mb-3 flex items-center gap-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
        In Trasferta ({employees.length})
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {employees.length > 0 ? (
          employees.map((employee) => (
            <div key={employee.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">
                      {employee.first_name} {employee.last_name}
                    </span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5">
                      Trasferta
                    </Badge>
                  </div>
                  {employee.businessTrip?.destination && (
                    <div className="text-xs text-blue-600 font-medium">
                      Destinazione: {employee.businessTrip.destination}
                    </div>
                  )}
                  {employee.businessTrip?.start_date && employee.businessTrip.end_date && (
                    <div className="text-xs text-blue-600 font-medium">
                      Periodo: {format(new Date(employee.businessTrip.start_date), 'dd/MM/yyyy')} - {format(new Date(employee.businessTrip.end_date), 'dd/MM/yyyy')}
                    </div>
                  )}
                  {employee.businessTrip?.reason && (
                    <p className="text-xs text-gray-600">{employee.businessTrip.reason}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">Nessun dipendente in trasferta</p>
        )}
      </div>
    </div>
  );
}

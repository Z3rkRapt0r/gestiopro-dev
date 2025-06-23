
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  attendance: {
    notes?: string;
  };
}

interface SickEmployeesSectionProps {
  employees: Employee[];
  onDeleteAttendance: (attendance: any) => void;
  isDeleting: boolean;
}

export default function SickEmployeesSection({ 
  employees, 
  onDeleteAttendance, 
  isDeleting 
}: SickEmployeesSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-orange-700 text-base mb-3 flex items-center gap-2">
        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
        In Malattia ({employees.length})
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {employees.length > 0 ? (
          employees.map((employee) => (
            <div key={employee.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">
                      {employee.first_name} {employee.last_name}
                    </span>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs px-1.5 py-0.5">
                      Malattia
                    </Badge>
                  </div>
                  {employee.attendance.notes && (
                    <p className="text-xs text-gray-600">{employee.attendance.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteAttendance(employee.attendance)}
                  disabled={isDeleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 h-7 w-7 p-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">Nessun dipendente in malattia</p>
        )}
      </div>
    </div>
  );
}

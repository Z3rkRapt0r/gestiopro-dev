
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  attendance?: any;
  leave?: any;
  permissionType?: string;
  permissionTimeFrom?: string;
  permissionTimeTo?: string;
  secondCheckinTime?: string;
}

interface PermissionEmployeesSectionProps {
  employees: Employee[];
  formatTime: (timeString: string | null) => string;
  toleranceMinutes?: number;
}

export default function PermissionEmployeesSection({ 
  employees,
  formatTime,
  toleranceMinutes = 0
}: PermissionEmployeesSectionProps) {
  
  // Funzione per calcolare se il dipendente è in orario o in ritardo
  const getPermissionStatus = (permissionTimeTo: string, secondCheckinTime: string) => {
    if (!permissionTimeTo || !secondCheckinTime) return 'Permesso Orario';
    
    // Converte gli orari in oggetti Date per il confronto
    const permissionEndTime = new Date(`2000-01-01T${permissionTimeTo}`);
    const checkinTime = new Date(`2000-01-01T${secondCheckinTime}`);
    
    // Calcola l'orario di fine permesso + tolleranza
    const toleranceTime = new Date(permissionEndTime);
    toleranceTime.setMinutes(toleranceTime.getMinutes() + toleranceMinutes);
    
    // Se il check-in è dopo l'orario di fine permesso + tolleranza, è in ritardo
    if (checkinTime > toleranceTime) {
      return 'In ritardo';
    } else {
      return 'In orario';
    }
  };
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-blue-700 text-base mb-3 flex items-center gap-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
        In Permesso ({employees.length})
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
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-1.5 py-0.5 ${
                        getPermissionStatus(employee.permissionTimeTo || '', employee.secondCheckinTime || '') === 'In ritardo'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {getPermissionStatus(employee.permissionTimeTo || '', employee.secondCheckinTime || '')}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-blue-600 font-medium">
                    {employee.permissionTimeFrom && employee.permissionTimeTo ? (
                      `Orario: ${employee.permissionTimeFrom} - ${employee.permissionTimeTo}`
                    ) : employee.attendance && employee.attendance.check_in_time && employee.attendance.check_out_time ? (
                      `Orario: ${formatTime(employee.attendance.check_in_time)} - ${formatTime(employee.attendance.check_out_time)}`
                    ) : employee.attendance && employee.attendance.notes && employee.attendance.notes.includes('(') ? (
                      employee.attendance.notes
                    ) : (
                      'Permesso Orario'
                    )}
                  </div>
                  
                  <div className="text-xs text-blue-600 font-medium">
                    Presenza secondaria: {employee.secondCheckinTime ? formatTime(employee.secondCheckinTime) : 'Non registrata'}
                  </div>
                  
                  {employee.leave?.note && (
                    <p className="text-xs text-gray-600">{employee.leave.note}</p>
                  )}
                  {employee.attendance?.notes && !employee.leave?.note && employee.attendance.notes !== 'Permesso' && (
                    <p className="text-xs text-gray-600">{employee.attendance.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">Nessun dipendente in permesso</p>
        )}
      </div>
    </div>
  );
}

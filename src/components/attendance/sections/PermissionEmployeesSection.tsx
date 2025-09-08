
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useMultipleCheckins } from '@/hooks/useMultipleCheckins';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  attendance?: any;
  leave?: any;
  permissionType?: string;
  permissionTimeFrom?: string;
  permissionTimeTo?: string;
}

interface PermissionEmployeesSectionProps {
  employees: Employee[];
  formatTime: (timeString: string | null) => string;
  selectedDate?: Date;
}

export default function PermissionEmployeesSection({ 
  employees,
  formatTime,
  selectedDate
}: PermissionEmployeesSectionProps) {
  // Hook per ottenere i check-in multipli per tutti i dipendenti
  const allMultipleCheckins = employees.map(employee => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: multipleCheckins } = useMultipleCheckins(employee.id);
    return { employeeId: employee.id, multipleCheckins };
  });

  // Funzione per ottenere la seconda entrata per un dipendente specifico
  const getSecondCheckin = (employeeId: string) => {
    if (!selectedDate) return null;
    
    const employeeData = allMultipleCheckins.find(data => data.employeeId === employeeId);
    if (!employeeData?.multipleCheckins) return null;
    
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const secondCheckins = employeeData.multipleCheckins.filter(checkin => 
      checkin.date === selectedDateStr && checkin.is_second_checkin
    );
    
    return secondCheckins.length > 0 ? secondCheckins[0] : null;
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
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs px-1.5 py-0.5">
                      Permesso Orario
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-blue-600 font-medium space-y-1">
                    {employee.permissionTimeFrom && employee.permissionTimeTo ? (
                      `Orario: ${employee.permissionTimeFrom} - ${employee.permissionTimeTo}`
                    ) : employee.attendance && employee.attendance.check_in_time && employee.attendance.check_out_time ? (
                      `Orario: ${formatTime(employee.attendance.check_in_time)} - ${formatTime(employee.attendance.check_out_time)}`
                    ) : employee.attendance && employee.attendance.notes && employee.attendance.notes.includes('(') ? (
                      employee.attendance.notes
                    ) : (
                      'Permesso Orario'
                    )}
                    
                    {/* Mostra la seconda entrata se disponibile */}
                    {(() => {
                      const secondCheckin = getSecondCheckin(employee.id);
                      return secondCheckin ? (
                        <div className="text-blue-700 font-semibold">
                          Seconda Entrata: {formatTime(secondCheckin.checkin_time)}
                        </div>
                      ) : null;
                    })()}
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

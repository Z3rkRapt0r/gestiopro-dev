
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

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
  onDeleteAttendance: (attendance: any) => void;
  onDeletePermissionRequest: (leave: any) => Promise<void>;
  isDeleting: boolean;
  deleteRequestMutation: { isPending: boolean };
  formatTime: (timeString: string | null) => string;
}

export default function PermissionEmployeesSection({ 
  employees, 
  onDeleteAttendance, 
  onDeletePermissionRequest,
  isDeleting,
  deleteRequestMutation,
  formatTime 
}: PermissionEmployeesSectionProps) {
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
                      {employee.permissionType === 'orario' ? 'Permesso Orario' : 'Permesso Giornaliero'}
                    </Badge>
                  </div>
                  
                  {employee.permissionType === 'orario' && (
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
                  )}
                  
                  {employee.leave?.note && (
                    <p className="text-xs text-gray-600">{employee.leave.note}</p>
                  )}
                  {employee.attendance?.notes && !employee.leave?.note && employee.attendance.notes !== 'Permesso' && (
                    <p className="text-xs text-gray-600">{employee.attendance.notes}</p>
                  )}
                </div>
                
                <div className="flex gap-1 ml-2">
                  {employee.attendance && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteAttendance(employee.attendance)}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                      title="Elimina presenza"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  
                  {employee.leave && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePermissionRequest(employee.leave)}
                      disabled={deleteRequestMutation.isPending}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-7 w-7 p-0"
                      title="Elimina richiesta permesso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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

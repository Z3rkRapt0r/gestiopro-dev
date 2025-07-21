
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';

interface PermissionEmployeesSectionProps {
  employees: any[];
  formatTime?: (time: string | null) => string;
  showTemporalStatus?: boolean;
}

export default function PermissionEmployeesSection({ 
  employees, 
  formatTime,
  showTemporalStatus = false 
}: PermissionEmployeesSectionProps) {
  const getStatusBadge = (employee: any) => {
    if (!showTemporalStatus || !employee.permissionStatus) {
      return null;
    }

    const { status, message } = employee.permissionStatus;
    
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs ml-2">
            <Clock className="w-3 h-3 mr-1" />
            Attivo
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 text-xs ml-2">
            <Clock className="w-3 h-3 mr-1" />
            Scaduto
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs ml-2">
            <Clock className="w-3 h-3 mr-1" />
            Prossimo
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStatusMessage = (employee: any) => {
    if (!showTemporalStatus || !employee.permissionStatus) {
      return null;
    }

    return (
      <div className="text-xs text-gray-500 mt-1">
        {employee.permissionStatus.message}
      </div>
    );
  };

  return (
    <div>
      <h3 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
        In Permesso ({employees.length})
        {showTemporalStatus && (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Tempo reale
          </Badge>
        )}
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {employees.length > 0 ? (
          employees.map((employee) => (
            <div key={employee.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium text-sm">
                      {employee.first_name} {employee.last_name}
                    </span>
                    {getStatusBadge(employee)}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {employee.permissionType === 'orario' ? (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Orario: {employee.permissionTimeFrom} - {employee.permissionTimeTo}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        Giornaliero
                      </Badge>
                    )}
                  </div>

                  {getStatusMessage(employee)}
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


import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';

interface AttendanceDelayBadgeProps {
  isLate: boolean;
  lateMinutes: number;
  className?: string;
}

export default function AttendanceDelayBadge({ 
  isLate, 
  lateMinutes, 
  className = "" 
}: AttendanceDelayBadgeProps) {
  if (!isLate) {
    return (
      <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-200 ${className}`}>
        <Clock className="w-3 h-3 mr-1" />
        In orario
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className={`bg-red-50 text-red-700 border-red-200 ${className}`}>
      <AlertTriangle className="w-3 h-3 mr-1" />
      In ritardo ({lateMinutes} min)
    </Badge>
  );
}

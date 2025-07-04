
import { useAuth } from '@/hooks/useAuth';
import { useEmployeeStats } from '@/hooks/useEmployeeStats';
import EmployeeStatsCards from './EmployeeStatsCards';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';

interface EmployeeDashboardContentProps {
  activeSection: string;
}

export default function EmployeeDashboardContent({ activeSection }: EmployeeDashboardContentProps) {
  const { profile } = useAuth();
  const { stats, loading } = useEmployeeStats();

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header semplificato per mobile */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
            <User className="h-6 w-6 text-white" />
          </div>
          <span>Ciao, {profile?.first_name}!</span>
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Le tue statistiche personali
        </p>
      </div>

      {/* Statistiche essenziali */}
      <EmployeeStatsCards stats={stats} />
    </div>
  );
}

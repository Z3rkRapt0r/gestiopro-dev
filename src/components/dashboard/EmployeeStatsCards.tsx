
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Bell, Calendar, CheckCircle, XCircle, Clock, Plane, Timer } from "lucide-react";

interface EmployeeStatsCardsProps {
  stats: {
    documentsCount: number;
    unreadNotificationsCount: number;
    leaveRequestsCount: number;
    pendingLeaveRequests: number;
    approvedLeaveRequests: number;
    rejectedLeaveRequests: number;
    vacationDaysRemaining: number;
    permissionHoursRemaining: number;
  };
}

const EmployeeStatsCards = ({ stats }: EmployeeStatsCardsProps) => {
  // Solo le statistiche più importanti per mobile
  const essentialStats = [
    {
      title: "Ferie Rimanenti",
      value: stats.vacationDaysRemaining,
      subtitle: "Giorni disponibili",
      icon: Plane,
      colorClass: "bg-blue-50 border-blue-200 text-blue-900",
      iconClass: "text-blue-600"
    },
    {
      title: "Permessi Rimanenti", 
      value: stats.permissionHoursRemaining,
      subtitle: "Ore disponibili",
      icon: Timer,
      colorClass: "bg-green-50 border-green-200 text-green-900",
      iconClass: "text-green-600"
    },
    {
      title: "In Attesa",
      value: stats.pendingLeaveRequests,
      subtitle: "Richieste pending",
      icon: Clock,
      colorClass: "bg-yellow-50 border-yellow-200 text-yellow-900",
      iconClass: "text-yellow-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {essentialStats.map((stat, index) => (
        <Card 
          key={index} 
          className={`${stat.colorClass} border-2 hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold truncate">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-5 w-5 ${stat.iconClass} flex-shrink-0`} />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold mb-1">
              {stat.value}
            </div>
            <p className={`text-xs ${stat.iconClass} opacity-80`}>
              {stat.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default EmployeeStatsCards;

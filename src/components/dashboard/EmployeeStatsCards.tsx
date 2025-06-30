
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
  // Prioritize most important stats for mobile
  const priorityStats = [
    {
      title: "Ferie Rimanenti",
      value: stats.vacationDaysRemaining,
      subtitle: "Giorni disponibili",
      icon: Plane,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      iconColor: "text-blue-600",
      valueColor: "text-blue-900",
      priority: 1
    },
    {
      title: "Permessi Rimanenti",
      value: stats.permissionHoursRemaining,
      subtitle: "Ore disponibili",
      icon: Timer,
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-50 to-green-100",
      borderColor: "border-green-200",
      textColor: "text-green-800",
      iconColor: "text-green-600",
      valueColor: "text-green-900",
      priority: 1
    },
    {
      title: "In Attesa",
      value: stats.pendingLeaveRequests,
      subtitle: "Richieste pending",
      icon: Clock,
      gradient: "from-yellow-500 to-yellow-600",
      bgGradient: "from-yellow-50 to-yellow-100",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-800",
      iconColor: "text-yellow-600",
      valueColor: "text-yellow-900",
      priority: 2
    },
    {
      title: "Notifiche",
      value: stats.unreadNotificationsCount,
      subtitle: "Da leggere",
      icon: Bell,
      gradient: "from-red-500 to-red-600",
      bgGradient: "from-red-50 to-red-100",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      iconColor: "text-red-600",
      valueColor: "text-red-900",
      priority: 2
    },
    {
      title: "Documenti",
      value: stats.documentsCount,
      subtitle: "Totali",
      icon: FileText,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200",
      textColor: "text-purple-800",
      iconColor: "text-purple-600",
      valueColor: "text-purple-900",
      priority: 3
    },
    {
      title: "Approvate",
      value: stats.approvedLeaveRequests,
      subtitle: "Richieste OK",
      icon: CheckCircle,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-50 to-emerald-100",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-800",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-900",
      priority: 3
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
      {/* Priority cards - Always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {priorityStats.filter(stat => stat.priority === 1).map((stat, index) => (
          <Card key={index} className={`bg-gradient-to-br ${stat.bgGradient} ${stat.borderColor} hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className={`text-sm sm:text-base font-medium ${stat.textColor} truncate`}>
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.iconColor} flex-shrink-0`} />
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-2xl sm:text-3xl font-bold ${stat.valueColor} mb-1`}>
                {stat.value}
              </div>
              <p className={`text-xs sm:text-sm ${stat.iconColor} truncate`}>
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary cards - Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {priorityStats.filter(stat => stat.priority === 2).map((stat, index) => (
          <Card key={index} className={`bg-gradient-to-br ${stat.bgGradient} ${stat.borderColor} hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className={`text-xs sm:text-sm font-medium ${stat.textColor} truncate`}>
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor} flex-shrink-0`} />
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-xl sm:text-2xl font-bold ${stat.valueColor} mb-1`}>
                {stat.value}
              </div>
              <p className={`text-xs ${stat.iconColor} truncate`}>
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tertiary cards - Hidden on mobile, visible on tablet+ */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {priorityStats.filter(stat => stat.priority === 3).map((stat, index) => (
          <Card key={index} className={`bg-gradient-to-br ${stat.bgGradient} ${stat.borderColor} hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
              <CardTitle className={`text-sm font-medium ${stat.textColor} truncate`}>
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor} flex-shrink-0`} />
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-xl sm:text-2xl font-bold ${stat.valueColor} mb-1`}>
                {stat.value}
              </div>
              <p className={`text-xs ${stat.iconColor} truncate`}>
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EmployeeStatsCards;

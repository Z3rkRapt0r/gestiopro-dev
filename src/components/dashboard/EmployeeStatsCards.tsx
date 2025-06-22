
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card ferie rimanenti - evidenziata */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">Ferie Rimanenti</CardTitle>
          <Plane className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">{stats.vacationDaysRemaining}</div>
          <p className="text-xs text-blue-600">Giorni disponibili</p>
        </CardContent>
      </Card>

      {/* Card permessi rimanenti - evidenziata */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800">Permessi Rimanenti</CardTitle>
          <Timer className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">{stats.permissionHoursRemaining}</div>
          <p className="text-xs text-green-600">Ore disponibili</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documenti Totali</CardTitle>
          <FileText className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.documentsCount}</div>
          <p className="text-xs text-muted-foreground">Documenti caricati</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notifiche Non Lette</CardTitle>
          <Bell className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.unreadNotificationsCount}</div>
          <p className="text-xs text-muted-foreground">Da leggere</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Richieste Ferie</CardTitle>
          <Calendar className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.leaveRequestsCount}</div>
          <p className="text-xs text-muted-foreground">Totali</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingLeaveRequests}</div>
          <p className="text-xs text-muted-foreground">Ferie in attesa</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Approvate</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.approvedLeaveRequests}</div>
          <p className="text-xs text-muted-foreground">Ferie approvate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Respinte</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.rejectedLeaveRequests}</div>
          <p className="text-xs text-muted-foreground">Ferie respinte</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeStatsCards;

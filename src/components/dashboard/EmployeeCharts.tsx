
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface EmployeeChartsProps {
  stats: {
    pendingLeaveRequests: number;
    approvedLeaveRequests: number;
    rejectedLeaveRequests: number;
    documentsCount: number;
    unreadNotificationsCount: number;
  };
}

const EmployeeCharts = ({ stats }: EmployeeChartsProps) => {
  // Provide default values if stats is undefined
  const safeStats = stats || {
    pendingLeaveRequests: 0,
    approvedLeaveRequests: 0,
    rejectedLeaveRequests: 0,
    documentsCount: 0,
    unreadNotificationsCount: 0,
  };

  const leaveRequestsData = [
    { name: 'In Attesa', value: safeStats.pendingLeaveRequests, color: '#f59e0b' },
    { name: 'Approvate', value: safeStats.approvedLeaveRequests, color: '#10b981' },
    { name: 'Respinte', value: safeStats.rejectedLeaveRequests, color: '#ef4444' },
  ];

  const activityData = [
    { name: 'Documenti', value: safeStats.documentsCount },
    { name: 'Notifiche', value: safeStats.unreadNotificationsCount },
  ];

  const chartConfig = {
    pending: { label: "In Attesa", color: "#f59e0b" },
    approved: { label: "Approvate", color: "#10b981" },
    rejected: { label: "Respinte", color: "#ef4444" },
    documents: { label: "Documenti", color: "#3b82f6" },
    notifications: { label: "Notifiche", color: "#8b5cf6" },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Stato Richieste Ferie</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveRequestsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={window.innerWidth < 640 ? 60 : window.innerWidth < 1024 ? 70 : 80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leaveRequestsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  wrapperStyle={{ 
                    fontSize: window.innerWidth < 640 ? '12px' : '14px',
                    maxWidth: window.innerWidth < 640 ? '200px' : '250px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          
          {/* Mobile legend */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 sm:hidden">
            {leaveRequestsData.map((entry, index) => (
              <div key={index} className="flex items-center gap-1 sm:gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs font-medium truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Attività Recente</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                  interval={0}
                  angle={window.innerWidth < 640 ? -45 : 0}
                  textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
                  height={window.innerWidth < 640 ? 60 : 30}
                />
                <YAxis 
                  tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                  width={window.innerWidth < 640 ? 30 : 40}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={window.innerWidth < 640 ? 40 : 60}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  wrapperStyle={{ 
                    fontSize: window.innerWidth < 640 ? '12px' : '14px',
                    maxWidth: window.innerWidth < 640 ? '200px' : '250px'
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeCharts;

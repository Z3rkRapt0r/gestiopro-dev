
import { useAttendanceArchive } from "@/hooks/useAttendanceArchive";
import AttendanceArchiveByYear from "./AttendanceArchiveByYear";

export default function AttendanceArchiveSection() {
  const { attendancesByEmployee, isLoading } = useAttendanceArchive();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (attendancesByEmployee.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nessuna presenza trovata nell'archivio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Archivio Presenze</h2>
        <p className="text-muted-foreground">
          Visualizza e gestisci tutte le presenze (manuali e automatiche) registrate per ogni dipendente
        </p>
      </div>

      {attendancesByEmployee.map(({ employee, attendances }) => (
        <AttendanceArchiveByYear 
          key={employee.id}
          employee={employee}
          attendances={attendances}
        />
      ))}
    </div>
  );
}

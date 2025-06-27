
import EmployeeLeaveArchiveByYear from "./EmployeeLeaveArchiveByYear";
import { LeaveRequest } from "@/hooks/useLeaveRequests";

interface EmployeeLeaveArchiveProps {
  employee: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  leaveRequests: LeaveRequest[];
  type: "permesso" | "ferie";
}

export default function EmployeeLeaveArchive({ employee, leaveRequests, type }: EmployeeLeaveArchiveProps) {
  return (
    <EmployeeLeaveArchiveByYear 
      employee={employee}
      leaveRequests={leaveRequests}
      type={type}
    />
  );
}

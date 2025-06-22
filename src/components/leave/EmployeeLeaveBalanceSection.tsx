
import React from "react";
import { EmployeeLeaveBalanceForm } from "./EmployeeLeaveBalanceForm";
import { EmployeeLeaveBalanceList } from "./EmployeeLeaveBalanceList";
import { useAuth } from "@/hooks/useAuth";

export function EmployeeLeaveBalanceSection() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <EmployeeLeaveBalanceList />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmployeeLeaveBalanceForm />
      <EmployeeLeaveBalanceList />
    </div>
  );
}

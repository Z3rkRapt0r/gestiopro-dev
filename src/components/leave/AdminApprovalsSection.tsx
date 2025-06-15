
import LeaveRequestsTable from "./LeaveRequestsTable";

export default function AdminApprovalsSection() {
  return (
    <div className="max-w-5xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-4">Approvazioni Permessi & Ferie</h2>
      <LeaveRequestsTable adminMode />
    </div>
  );
}

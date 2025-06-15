
import { useState } from "react";
import { Button } from "@/components/ui/button";
import LeaveRequestForm from "./LeaveRequestForm";
import LeaveRequestsTable from "./LeaveRequestsTable";

export default function EmployeeLeavePage() {
  const [formType, setFormType] = useState<"permesso" | "ferie" | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-2xl mx-auto py-8 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-center">Richieste Ferie & Permessi</h2>
      <div className="flex gap-4 justify-center mb-6">
        <Button
          variant={formType === "permesso" ? "default" : "outline"}
          onClick={() => { setFormType("permesso"); setShowForm(true); }}
        >
          Richiesta permesso
        </Button>
        <Button
          variant={formType === "ferie" ? "default" : "outline"}
          onClick={() => { setFormType("ferie"); setShowForm(true); }}
        >
          Richiesta ferie
        </Button>
      </div>
      {showForm && formType && (
        <div className="mb-8">
          <LeaveRequestForm
            type={formType}
            onSuccess={() => { setShowForm(false); setFormType(null); }}
          />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">Le mie richieste</h3>
      <LeaveRequestsTable />
    </div>
  );
}

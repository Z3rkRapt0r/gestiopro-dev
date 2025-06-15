
import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeaveRequestForm from "./LeaveRequestForm";
import LeaveRequestsCardsGrid from "./LeaveRequestsCardsGrid";

export default function EmployeeLeavePage() {
  const [formType, setFormType] = useState<"permesso" | "ferie" | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-center font-bold">Richieste Ferie & Permessi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Button
              variant={formType === "permesso" ? "default" : "outline"}
              className="flex-1"
              onClick={() => {
                setFormType("permesso");
                setShowForm(true);
              }}
            >
              Richiesta permesso
            </Button>
            <Button
              variant={formType === "ferie" ? "default" : "outline"}
              className="flex-1"
              onClick={() => {
                setFormType("ferie");
                setShowForm(true);
              }}
            >
              Richiesta ferie
            </Button>
          </div>
          {showForm && formType && (
            <div className="mb-8 animate-fade-in">
              <LeaveRequestForm
                type={formType}
                onSuccess={() => {
                  setShowForm(false);
                  setFormType(null);
                }}
              />
            </div>
          )}
          <h3 className="text-lg font-semibold mt-8 mb-2">Le mie richieste</h3>
          <div className="rounded border bg-muted/30 p-2">
            <LeaveRequestsCardsGrid />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

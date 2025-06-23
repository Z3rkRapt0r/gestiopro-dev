
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmployeeLeaveBalanceForm } from './EmployeeLeaveBalanceForm';
import { EmployeeLeaveBalanceList } from './EmployeeLeaveBalanceList';

export function EmployeeLeaveBalanceSection() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-2">Gestione Bilanci Ferie e Permessi</CardTitle>
              <p className="text-muted-foreground">
                Visualizza e gestisci i bilanci annuali di ferie e permessi per tutti i dipendenti
              </p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              size="sm"
            >
              {showForm ? 'Nascondi Form' : 'Nuovo Bilancio'}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {showForm && (
            <EmployeeLeaveBalanceForm onSuccess={() => setShowForm(false)} />
          )}
          
          <EmployeeLeaveBalanceList />
        </CardContent>
      </Card>
    </div>
  );
}

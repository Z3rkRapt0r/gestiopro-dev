
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmployeeLeaveBalanceForm } from './EmployeeLeaveBalanceForm';
import { EmployeeLeaveBalanceList } from './EmployeeLeaveBalanceList';
import { useLeaveBalanceSync } from '@/hooks/useLeaveBalanceSync';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export function EmployeeLeaveBalanceSection() {
  const [showForm, setShowForm] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { recalculateAllBalances } = useLeaveBalanceSync();

  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    try {
      await recalculateAllBalances();
    } catch (error) {
      console.error('Errore nel ricalcolo:', error);
    } finally {
      setIsRecalculating(false);
    }
  };

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
            <div className="flex gap-2">
              <Button
                onClick={handleRecalculateAll}
                disabled={isRecalculating}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                {isRecalculating ? 'Ricalcolando...' : 'Ricalcola Tutto'}
              </Button>
              <Button
                onClick={() => setShowForm(!showForm)}
                size="sm"
              >
                {showForm ? 'Nascondi Form' : 'Nuovo Bilancio'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sistema di Sincronizzazione Automatica Attivo</strong>
              <br />
              I bilanci vengono ora aggiornati automaticamente quando:
              <ul className="list-disc list-inside mt-2 ml-4">
                <li>Una richiesta di ferie/permesso viene approvata o rifiutata</li>
                <li>Una richiesta viene eliminata</li>
                <li>Il calcolo utilizza la configurazione degli orari lavorativi</li>
              </ul>
              <div className="flex items-center gap-2 mt-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Trigger Database Attivi</span>
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">v2.0</Badge>
              </div>
            </AlertDescription>
          </Alert>

          {showForm && (
            <EmployeeLeaveBalanceForm onSuccess={() => setShowForm(false)} />
          )}
          
          <EmployeeLeaveBalanceList />
        </CardContent>
      </Card>
    </div>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConflictStats {
  business_trips: number;
  approved_leaves: number;
  existing_permissions: number;
  sick_leaves: number;
  existing_attendances: number;
}

interface ConflictLegendProps {
  stats: ConflictStats;
  className?: string;
}

export function ConflictLegend({ stats, className }: ConflictLegendProps) {
  const legendItems = [
    {
      type: 'business_trip',
      label: 'Trasferte Approvate',
      color: 'bg-red-500',
      description: 'Conflitto critico - trasferta già programmata',
      count: stats.business_trips,
    },
    {
      type: 'approved_leave',
      label: 'Ferie Approvate',
      color: 'bg-orange-500',
      description: 'Conflitto critico - ferie già approvate',
      count: stats.approved_leaves,
    },
    {
      type: 'existing_permission',
      label: 'Permessi Esistenti',
      color: 'bg-yellow-500',
      description: 'Conflitto critico - permesso già richiesto/approvato',
      count: stats.existing_permissions,
    },
    {
      type: 'sick_leave',
      label: 'Malattie Registrate',
      color: 'bg-purple-500',
      description: 'Conflitto critico - malattia già registrata',
      count: stats.sick_leaves,
    },
    {
      type: 'existing_attendance',
      label: 'Presenze Registrate',
      color: 'bg-blue-400',
      description: 'Informazione - presenza già registrata',
      count: stats.existing_attendances,
    },
  ];

  const totalConflicts = Object.values(stats).reduce((sum, count) => sum + count, 0);

  if (totalConflicts === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-green-600">
            ✅ <span className="font-medium">Nessun conflitto rilevato</span>
            <p className="text-sm text-muted-foreground mt-1">
              Tutte le date sono disponibili per la richiesta
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Conflitti Rilevati</span>
          <Badge variant="destructive" className="text-xs">
            {totalConflicts} conflitti
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {legendItems
            .filter(item => item.count > 0)
            .map((item) => (
              <div key={item.type} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-sm ${item.color} flex-shrink-0`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">💡 Suggerimento:</span> Le date evidenziate in rosso, arancione, giallo e viola non possono essere selezionate. 
            Scegli date senza colori per evitare conflitti.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

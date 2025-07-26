
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User } from 'lucide-react';
import { useUpcomingLeaves } from '@/hooks/useUpcomingLeaves';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function UpcomingLeavesSection() {
  const [daysRange, setDaysRange] = useState<number>(10);
  const { upcomingLeaves, isLoading } = useUpcomingLeaves(daysRange);

  const getTypeLabel = (type: string) => {
    return type === 'ferie' ? 'Ferie' : 'Permesso';
  };

  const getTypeColor = (type: string) => {
    return type === 'ferie' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getDaysUntilBadge = (daysUntil: number) => {
    if (daysUntil === 0) {
      return <Badge variant="destructive">Oggi</Badge>;
    } else if (daysUntil === 1) {
      return <Badge variant="secondary">Domani</Badge>;
    } else if (daysUntil <= 3) {
      return <Badge variant="outline" className="border-orange-300 text-orange-700">
        Fra {daysUntil} giorni
      </Badge>;
    } else {
      return <Badge variant="outline">Fra {daysUntil} giorni</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Ferie e Permessi Imminenti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Caricamento...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Ferie e Permessi Imminenti
          </CardTitle>
          <Select 
            value={daysRange.toString()} 
            onValueChange={(value) => setDaysRange(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 giorni</SelectItem>
              <SelectItem value="30">30 giorni</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingLeaves.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nessuna ferie/permesso programmato nei prossimi {daysRange} giorni</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingLeaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {leave.first_name} {leave.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {leave.email}
                    </div>
                    {leave.note && (
                      <div className="text-sm text-gray-500 mt-1">
                        Note: {leave.note}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getTypeColor(leave.type)}>
                      {getTypeLabel(leave.type)}
                    </Badge>
                    {getDaysUntilBadge(leave.days_until)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {leave.type === 'ferie' && leave.start_date !== leave.end_date ? (
                      <>
                        {format(new Date(leave.start_date), 'dd MMM', { locale: it })} - {' '}
                        {format(new Date(leave.end_date), 'dd MMM yyyy', { locale: it })}
                      </>
                    ) : (
                      format(new Date(leave.start_date), 'dd MMM yyyy', { locale: it })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

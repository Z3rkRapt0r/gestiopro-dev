
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Briefcase, 
  Calendar, 
  Clock, 
  Heart, 
  UserCheck,
  Info
} from 'lucide-react';
import { ConflictSummary, ConflictDetail } from '@/hooks/useLeaveConflicts';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ConflictSummaryCardProps {
  summary: ConflictSummary;
  details: ConflictDetail[];
  employeeName?: string;
  isLoading?: boolean;
}

export default function ConflictSummaryCard({ 
  summary, 
  details, 
  employeeName = "dipendente selezionato",
  isLoading = false 
}: ConflictSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
            <span className="text-sm text-blue-700">Calcolo conflitti in corso...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (summary.totalConflicts === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              Nessun conflitto trovato per {employeeName}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConflictIcon = (type: ConflictDetail['type']) => {
    switch (type) {
      case 'business_trip':
        return <Briefcase className="h-3 w-3" />;
      case 'vacation':
        return <Calendar className="h-3 w-3" />;
      case 'permission':
        return <Clock className="h-3 w-3" />;
      case 'sick_leave':
        return <Heart className="h-3 w-3" />;
      case 'attendance':
        return <UserCheck className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const getConflictColor = (type: ConflictDetail['type']) => {
    switch (type) {
      case 'business_trip':
        return 'bg-purple-100 text-purple-800';
      case 'vacation':
        return 'bg-orange-100 text-orange-800';
      case 'permission':
        return 'bg-blue-100 text-blue-800';
      case 'sick_leave':
        return 'bg-red-100 text-red-800';
      case 'attendance':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Raggruppa dettagli per data
  const detailsByDate = details.reduce((acc, detail) => {
    if (!acc[detail.date]) {
      acc[detail.date] = [];
    }
    acc[detail.date].push(detail);
    return acc;
  }, {} as Record<string, ConflictDetail[]>);

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-orange-800 font-semibold">
              Conflitti Rilevati per {employeeName}
            </span>
          </div>
          <Badge variant="destructive" className="text-xs">
            {summary.totalConflicts} date bloccate
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Riepilogo numerico */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {summary.businessTrips > 0 && (
            <div className="flex items-center space-x-1 bg-purple-100 rounded px-2 py-1">
              <Briefcase className="h-3 w-3 text-purple-600" />
              <span className="text-xs text-purple-800 font-medium">{summary.businessTrips}</span>
            </div>
          )}
          {summary.vacations > 0 && (
            <div className="flex items-center space-x-1 bg-orange-100 rounded px-2 py-1">
              <Calendar className="h-3 w-3 text-orange-600" />
              <span className="text-xs text-orange-800 font-medium">{summary.vacations}</span>
            </div>
          )}
          {summary.permissions > 0 && (
            <div className="flex items-center space-x-1 bg-blue-100 rounded px-2 py-1">
              <Clock className="h-3 w-3 text-blue-600" />
              <span className="text-xs text-blue-800 font-medium">{summary.permissions}</span>
            </div>
          )}
          {summary.sickLeaves > 0 && (
            <div className="flex items-center space-x-1 bg-red-100 rounded px-2 py-1">
              <Heart className="h-3 w-3 text-red-600" />
              <span className="text-xs text-red-800 font-medium">{summary.sickLeaves}</span>
            </div>
          )}
          {summary.attendances > 0 && (
            <div className="flex items-center space-x-1 bg-gray-100 rounded px-2 py-1">
              <UserCheck className="h-3 w-3 text-gray-600" />
              <span className="text-xs text-gray-800 font-medium">{summary.attendances}</span>
            </div>
          )}
        </div>

        {/* Alert informativo */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Le date evidenziate non sono selezionabili. Verifica i dettagli sotto per risolvere i conflitti.
          </AlertDescription>
        </Alert>

        {/* Dettagli espandibili */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
              <span>Visualizza dettagli conflitti</span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2 mt-2">
            {Object.entries(detailsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dateDetails]) => (
                <div key={date} className="bg-white rounded border p-3">
                  <div className="font-medium text-sm text-gray-900 mb-2">
                    {format(new Date(date), 'EEEE, d MMMM yyyy', { locale: it })}
                  </div>
                  <div className="space-y-1">
                    {dateDetails.map((detail, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getConflictColor(detail.type)}`}
                        >
                          <span className="mr-1">{getConflictIcon(detail.type)}</span>
                          {detail.description}
                        </Badge>
                        {detail.severity === 'critical' && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

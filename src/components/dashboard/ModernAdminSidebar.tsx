
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  Users,
  Calendar,
  FileText,
  Bell,
  Settings,
  Clock,
  MapPin,
  Plane,
  UserPlus,
  CalendarDays,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernAdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function ModernAdminSidebar({ 
  activeSection, 
  onSectionChange 
}: ModernAdminSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['attendance']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuItems = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: Home,
      type: 'single' as const,
    },
    {
      id: 'employees',
      label: 'Dipendenti',
      icon: Users,
      type: 'single' as const,
    },
    {
      id: 'attendance',
      label: 'Gestione Presenze',
      icon: Calendar,
      type: 'expandable' as const,
      children: [
        { id: 'attendance-overview', label: 'Panoramica', icon: Calendar },
        { id: 'manual-attendance', label: 'Inserimento Manuale', icon: UserPlus },
        { id: 'business-trips', label: 'Trasferte', icon: Plane },
        { id: 'sick-leaves', label: 'Malattie', icon: Clock },
        { id: 'overtime', label: 'Straordinari', icon: Clock },
        { id: 'company-holidays', label: 'Giorni Festivi', icon: CalendarDays },
      ],
    },
    {
      id: 'leave-approvals',
      label: 'Ferie e Permessi',
      icon: MapPin,
      type: 'single' as const,
    },
    {
      id: 'documents',
      label: 'Documenti',
      icon: FileText,
      type: 'single' as const,
    },
    {
      id: 'notifications',
      label: 'Notifiche',
      icon: Bell,
      type: 'single' as const,
    },
    {
      id: 'settings',
      label: 'Impostazioni',
      icon: Settings,
      type: 'single' as const,
    },
  ];

  return (
    <div className="w-64 border-r bg-card h-full flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">Admin Panel</h2>
      </div>
      
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <div key={item.id}>
              {item.type === 'single' ? (
                <Button
                  variant={activeSection === item.id ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    activeSection === item.id && 'bg-secondary'
                  )}
                  onClick={() => onSectionChange(item.id)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              ) : (
                <div>
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    onClick={() => toggleSection(item.id)}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </div>
                    {expandedSections.includes(item.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {expandedSections.includes(item.id) && item.children && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Button
                          key={child.id}
                          variant={activeSection === child.id ? 'secondary' : 'ghost'}
                          size="sm"
                          className={cn(
                            'w-full justify-start pl-4',
                            activeSection === child.id && 'bg-secondary'
                          )}
                          onClick={() => onSectionChange(child.id)}
                        >
                          <child.icon className="mr-2 h-3 w-3" />
                          {child.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

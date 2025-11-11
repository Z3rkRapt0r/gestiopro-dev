import { useState, useEffect } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, Mail, Users, Palette, Search, ChevronRight, Clock, Home, FileText, Globe, LogIn, Briefcase, MapPin, Timer, Zap, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardCustomizationSection from "./DashboardCustomizationSection";
import LoginCustomizationSection from "./LoginCustomizationSection";
import EmployeeLogosSection from "./EmployeeLogosSection";
import EmailTemplateManager from "./EmailTemplateManager";
import AttendanceSettings from "@/components/attendance/AttendanceSettings";
import WorkScheduleSettings from "./WorkScheduleSettings";
import AppGeneralSettingsSection from "./AppGeneralSettingsSection";

const AdminSettingsSection = () => {
  const { resendSettings, setResendSettings, loading, saveResendSettings } = useAdminSettings();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('frequenti');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSaveResendSettings = () => {
    saveResendSettings(resendSettings);
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  // Definisco le categorie delle impostazioni riorganizzate
  const settingsCategories = [
    {
      id: 'frequenti',
      title: 'Impostazioni Frequenti',
      description: 'Accesso rapido alle impostazioni più utilizzate',
      icon: Star,
      color: 'text-orange-600',
      settings: [
        {
          id: 'email-config',
          title: 'Configurazione Email',
          description: 'API Key e mittente email',
          icon: Mail,
          component: 'resend',
          badge: 'Importante'
        },
        {
          id: 'email-templates',
          title: 'Modelli Email',
          description: 'Template email automatiche',
          icon: FileText,
          component: 'emailtemplates',
          badge: null
        },
        {
          id: 'work-schedules',
          title: 'Orari di Lavoro',
          description: 'Orari e turni aziendali',
          icon: Clock,
          component: 'work-schedules',
          badge: null
        },
        {
          id: 'attendance',
          title: 'Presenze GPS',
          description: 'Configurazione rilevamento GPS',
          icon: MapPin,
          component: 'attendances',
          badge: null
        }
      ]
    },
    {
      id: 'email-communications',
      title: 'Email & Comunicazioni',
      description: 'Gestione email e notifiche automatiche',
      icon: Mail,
      color: 'text-blue-600',
      settings: [
        {
          id: 'email-config',
          title: 'Configurazione Email',
          description: 'Impostazioni Resend e mittente',
          icon: Settings,
          component: 'resend',
          badge: 'Importante'
        },
        {
          id: 'email-templates',
          title: 'Modelli Email',
          description: 'Gestisci i template delle email',
          icon: FileText,
          component: 'emailtemplates',
          badge: null
        }
      ]
    },
    {
      id: 'employee-hours',
      title: 'Dipendenti & Orari',
      description: 'Gestione dipendenti e pianificazione turni',
      icon: Users,
      color: 'text-green-600',
      settings: [
        {
          id: 'employee-logos',
          title: 'Loghi Dipendenti',
          description: 'Loghi personalizzati dei dipendenti',
          icon: Briefcase,
          component: 'employeelogos',
          badge: null
        },
        {
          id: 'work-schedules',
          title: 'Orari di Lavoro',
          description: 'Configura orari e turni di lavoro',
          icon: Clock,
          component: 'work-schedules',
          badge: null
        }
      ]
    },
    {
      id: 'attendance-monitoring',
      title: 'Presenze & Monitoraggio',
      description: 'Sistema di rilevamento presenze e controllo',
      icon: Clock,
      color: 'text-amber-600',
      settings: [
        {
          id: 'attendance',
          title: 'Impostazioni Presenze',
          description: 'Rilevamento GPS e check-in/out',
          icon: MapPin,
          component: 'attendances',
          badge: null
        }
      ]
    },
    {
      id: 'customization',
      title: 'Personalizzazione',
      description: 'Aspetto grafico e branding dell\'applicazione',
      icon: Palette,
      color: 'text-purple-600',
      settings: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: 'Colori e layout della dashboard',
          icon: Home,
          component: 'dashboard',
          badge: null
        },
        {
          id: 'login',
          title: 'Pagina Login',
          description: 'Personalizza la schermata di accesso',
          icon: LogIn,
          component: 'login',
          badge: null
        },
        {
          id: 'app-general',
          title: 'Impostazioni Generali',
          description: 'Configurazioni globali dell\'app',
          icon: Globe,
          component: 'app-general',
          badge: null
        }
      ]
    }
  ];

  // Ottieni la categoria attiva corrente
  const currentCategory = settingsCategories.find(cat => cat.id === activeTab);

  // Breadcrumb navigation
  const getBreadcrumb = () => {
    const parts = ['Home', 'Impostazioni'];
    if (currentCategory) {
      parts.push(currentCategory.title);
    }
    if (activeSection) {
      const allSettings = settingsCategories.flatMap(cat => cat.settings);
      const currentSetting = allSettings.find(s => s.component === activeSection);
      if (currentSetting) {
        parts.push(currentSetting.title);
      }
    }
    return parts;
  };

  // Layout principale con Tabs + Sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Sticky */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-gray-700" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Impostazioni Amministratore</h1>
                <p className="text-sm text-gray-600">Configura e personalizza il tuo sistema aziendale</p>
              </div>
            </div>
            <Button
              onClick={handleBackToDashboard}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            {getBreadcrumb().map((part, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="w-3 h-3" />}
                <span className={index === getBreadcrumb().length - 1 ? 'font-medium text-gray-900' : ''}>
                  {part}
                </span>
              </div>
            ))}
          </div>

          {/* Barra di ricerca */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Cerca impostazioni..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setActiveSection(null); }} className="w-full">
          {/* Tabs Navigation */}
          <TabsList className="grid w-full grid-cols-5 mb-6 h-auto p-1">
            {settingsCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-white"
                >
                  <IconComponent className={`w-5 h-5 ${category.color}`} />
                  <span className="text-xs font-medium">{category.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tabs Content */}
          {settingsCategories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-0">
              <div className="flex gap-6">
                {/* Sidebar */}
                <Card className="w-72 h-fit sticky top-32">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <category.icon className={`w-4 h-4 ${category.color}`} />
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-1">
                      {category.settings.map((setting) => {
                        const SettingIcon = setting.icon;
                        const isActive = activeSection === setting.component;
                        return (
                          <button
                            key={setting.id}
                            onClick={() => setActiveSection(setting.component)}
                            className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 ${
                              isActive
                                ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-900'
                                : 'hover:bg-gray-50 border-l-4 border-transparent text-gray-700'
                            }`}
                          >
                            <SettingIcon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{setting.title}</span>
                                {setting.badge && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    {setting.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{setting.description}</p>
                            </div>
                            <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Main Content Area */}
                <div className="flex-1">
                  {activeSection ? (
                    <>
                      {/* Contenuto della sezione selezionata */}
                      {activeSection === 'resend' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Mail className="w-5 h-5" />
                              Configurazione Email
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label htmlFor="api-key">API Key Resend</Label>
                              <Input
                                id="api-key"
                                type="password"
                                placeholder="re_xxxxxxxxxxxxx"
                                value={resendSettings.apiKey}
                                onChange={e => setResendSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                              />
                            </div>

                            <div>
                              <Label htmlFor="sender-name">Nome Mittente</Label>
                              <Input
                                id="sender-name"
                                placeholder="es. La Tua Azienda"
                                value={resendSettings.senderName}
                                onChange={e => setResendSettings(prev => ({ ...prev, senderName: e.target.value }))}
                              />
                            </div>

                            <div>
                              <Label htmlFor="sender-email">Email Mittente</Label>
                              <Input
                                id="sender-email"
                                type="email"
                                placeholder="noreply@tuaazienda.com"
                                value={resendSettings.senderEmail}
                                onChange={e => setResendSettings(prev => ({ ...prev, senderEmail: e.target.value }))}
                              />
                            </div>

                            <div>
                              <Label htmlFor="reply-to">Email di Risposta</Label>
                              <Input
                                id="reply-to"
                                type="email"
                                placeholder="info@tuaazienda.com"
                                value={resendSettings.replyTo}
                                onChange={e => setResendSettings(prev => ({ ...prev, replyTo: e.target.value }))}
                              />
                            </div>

                            <div className="pt-4">
                              <Button
                                onClick={handleSaveResendSettings}
                                disabled={loading || !resendSettings.apiKey}
                                size="lg"
                                className="w-full"
                              >
                                {loading ? 'Salvataggio...' : 'Salva Configurazione'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {activeSection === 'emailtemplates' && <EmailTemplateManager />}
                      {activeSection === 'attendances' && <AttendanceSettings />}
                      {activeSection === 'work-schedules' && <WorkScheduleSettings />}
                      {activeSection === 'dashboard' && <DashboardCustomizationSection />}
                      {activeSection === 'login' && <LoginCustomizationSection />}
                      {activeSection === 'employeelogos' && <EmployeeLogosSection />}
                      {activeSection === 'app-general' && <AppGeneralSettingsSection />}
                    </>
                  ) : (
                    <Card className="p-8">
                      <div className="text-center py-12">
                        <category.icon className={`w-16 h-16 mx-auto mb-4 ${category.color}`} />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.title}</h3>
                        <p className="text-gray-600 mb-6">{category.description}</p>
                        <p className="text-sm text-gray-500">
                          Seleziona un'impostazione dal menu laterale per iniziare
                        </p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto px-6 py-6 border-t mt-12">
        <p className="text-center text-xs text-gray-500">
          Powered by{' '}
          <a
            href="https://licenseglobal.it"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-medium text-orange-600"
          >
            License Global
          </a>
        </p>
      </div>
    </div>
  );
};

export default AdminSettingsSection;
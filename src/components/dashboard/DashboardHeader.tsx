import { useDashboardSettings } from "@/hooks/useDashboardSettings";
interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}
const DashboardHeader = ({
  title,
  subtitle
}: DashboardHeaderProps) => {
  const {
    settings,
    loading
  } = useDashboardSettings();
  if (loading) {
    return <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
      </div>;
  }
  return <div className="mb-8">
      {/* Logo e Nome Azienda */}
      <div className="flex items-center space-x-4 mb-4">
        {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="h-10 w-auto object-contain" />}
        
      </div>
      
      {/* Titolo Dashboard */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>
    </div>;
};
export default DashboardHeader;
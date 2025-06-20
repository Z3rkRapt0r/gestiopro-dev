import { BarChart3, Calendar, Clock, FileText, MessageSquare } from "lucide-react";

interface EmployeeDashboardSidebarProps {
  activeSection: 'overview' | 'leaves' | 'attendances' | 'documents' | 'messages';
  setActiveSection: (section: 'overview' | 'leaves' | 'attendances' | 'documents' | 'messages') => void;
}

export default function EmployeeDashboardSidebar({ activeSection, setActiveSection }: EmployeeDashboardSidebarProps) {
  return (
    <div className="w-64 bg-white shadow-sm border-r min-h-screen">
      <div className="p-6">
        <nav className="space-y-2">
          <button
            onClick={() => setActiveSection('overview')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'overview'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5" />
              Panoramica
            </div>
          </button>

          <button
            onClick={() => setActiveSection('leaves')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'leaves'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5" />
              Permessi & Ferie
            </div>
          </button>

          <button
            onClick={() => setActiveSection('attendances')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'attendances'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              Presenze
            </div>
          </button>

          <button
            onClick={() => setActiveSection('documents')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'documents'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              Documenti
            </div>
          </button>

          <button
            onClick={() => setActiveSection('messages')}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'messages'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5" />
              Messaggi
            </div>
          </button>
        </nav>
      </div>
    </div>
  );
}

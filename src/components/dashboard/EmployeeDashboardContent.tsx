
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentsSection from "./DocumentsSection";
import EmployeeMessagesSection from "./EmployeeMessagesSection";
import NotificationsSection from "./NotificationsSection";
import EmployeeDashboardSection from "./EmployeeDashboardSection";
import EmployeeLeavePage from "@/components/leave/EmployeeLeavePage";
import EmployeeProfileSection from "./EmployeeProfileSection";

interface EmployeeDashboardContentProps {
  activeSection: string;
}

const SectionSkeleton = () => (
  <div className="py-12">
    <Skeleton className="h-6 w-1/3 mb-6" />
    <Skeleton className="h-48 w-full" />
  </div>
);

const EmployeeDashboardContent = ({ activeSection }: EmployeeDashboardContentProps) => {
  return (
    <div className="flex-1">
      <Suspense fallback={<SectionSkeleton />}>
        {activeSection === 'dashboard' && <EmployeeDashboardSection />}
        {activeSection === 'documents' && <DocumentsSection />}
        {activeSection === 'notifications' && <NotificationsSection />}
        {activeSection === 'profile' && <EmployeeProfileSection />}
        {activeSection === 'messages' && <EmployeeMessagesSection />}
        {activeSection === "leave" && <EmployeeLeavePage />}
      </Suspense>
    </div>
  );
};

export default EmployeeDashboardContent;

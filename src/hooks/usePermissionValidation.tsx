import { useAppGeneralSettings } from "@/hooks/useAppGeneralSettings";

export function usePermissionValidation() {
  const { getMaxPermissionHours } = useAppGeneralSettings();

  const validatePermissionHours = (hours: number) => {
    const maxHours = getMaxPermissionHours();
    
    return {
      isValid: hours <= maxHours,
      maxAllowed: maxHours,
      current: hours,
      errorMessage: hours > maxHours 
        ? `Il numero massimo di ore consentite per un permesso è ${maxHours}. Hai richiesto ${hours} ore.`
        : null
    };
  };

  const getMaxPermissionHoursForDisplay = () => {
    return getMaxPermissionHours();
  };

  return {
    validatePermissionHours,
    getMaxPermissionHoursForDisplay,
    maxPermissionHours: getMaxPermissionHours()
  };
}

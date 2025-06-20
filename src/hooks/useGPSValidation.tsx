
import { useAttendanceSettings } from './useAttendanceSettings';

// Funzione per calcolare la distanza tra due coordinate in metri usando la formula di Haversine
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Raggio della Terra in metri
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // in metri
  return distance;
};

export const useGPSValidation = () => {
  const { settings } = useAttendanceSettings();

  const validateLocation = (
    userLatitude: number, 
    userLongitude: number, 
    isBusinessTrip: boolean = false
  ): { isValid: boolean; distance?: number; message?: string } => {
    // Se è in trasferta, non fare controlli GPS
    if (isBusinessTrip) {
      console.log('Trasferta: controllo GPS saltato');
      return { isValid: true };
    }

    // Se non ci sono coordinate aziendali configurate, permetti sempre
    if (!settings?.company_latitude || !settings?.company_longitude) {
      console.log('Coordinate aziendali non configurate: controllo GPS saltato');
      return { isValid: true };
    }

    const distance = calculateDistance(
      userLatitude,
      userLongitude,
      settings.company_latitude,
      settings.company_longitude
    );

    const maxDistance = settings.attendance_radius_meters || 500;
    const isValid = distance <= maxDistance;

    console.log('Controllo GPS:', {
      userLocation: { latitude: userLatitude, longitude: userLongitude },
      companyLocation: { lat: settings.company_latitude, lng: settings.company_longitude },
      distance: Math.round(distance),
      maxDistance,
      isValid
    });

    return {
      isValid,
      distance: Math.round(distance),
      message: isValid 
        ? undefined 
        : `Devi essere entro ${maxDistance} metri dall'azienda per registrare la presenza. Distanza attuale: ${Math.round(distance)} metri.`
    };
  };

  return {
    validateLocation,
    settings
  };
};

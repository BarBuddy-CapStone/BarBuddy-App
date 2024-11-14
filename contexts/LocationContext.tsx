import { GoongLocation } from "@/services/goong";
import { createContext, useContext, useEffect, useState } from "react";
import * as Location from 'expo-location';

type LocationContextType = {
  userLocation: GoongLocation | null;
  setUserLocation: (location: GoongLocation | null) => void;
  locationPermission: 'granted' | 'denied';
  checkAndGetLocation: () => Promise<GoongLocation | null>;
};

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [userLocation, setUserLocation] = useState<GoongLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied'>('denied');

  // Thêm hàm kiểm tra permission và lấy vị trí
  const checkAndGetLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status as 'granted' | 'denied');

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const newLocation = {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        };
        setUserLocation(newLocation);
        return newLocation;
      }
      return null;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  // Kiểm tra permission khi component mount
  useEffect(() => {
    checkAndGetLocation();
  }, []);

  return (
    <LocationContext.Provider value={{ 
      userLocation, 
      setUserLocation,
      locationPermission,
      checkAndGetLocation
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return context;
}; 
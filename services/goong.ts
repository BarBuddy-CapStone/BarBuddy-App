import axios from 'axios';
import { GOONG_CONFIG } from '@/config/goong';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GoongLocation {
  lat: number;
  lng: number;
}

export interface GoongAddress {
  formatted_address: string;
  geometry: {
    location: GoongLocation;
  };
}

class GoongService {
  private readonly apiKey = GOONG_CONFIG.API_KEY;
  private readonly baseUrl = GOONG_CONFIG.API_URL;
  private readonly maxRetries = 5;
  private readonly retryDelay = 100;

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = this.maxRetries): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && axios.isAxiosError(error) && error.response?.status === 429) {
        await this.delay(this.retryDelay);
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  async geocodeAddress(address: string): Promise<GoongLocation | null> {
    try {
      const cacheKey = `location_${address}`;
      const cachedLocation = await AsyncStorage.getItem(cacheKey);
      
      if (cachedLocation) {
        return JSON.parse(cachedLocation);
      }

      await this.delay(100);

      const location = await this.retryOperation(async () => {
        const response = await axios.get(
          `${this.baseUrl}/geocode?address=${encodeURIComponent(address)}&api_key=${this.apiKey}`
        );
        
        if (response.data.results && response.data.results.length > 0) {
          return response.data.results[0].geometry.location;
        }
        return null;
      });

      if (location) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(location));
      }
      
      return location;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  async calculateDistance(
    origin: GoongLocation,
    destination: GoongLocation
  ): Promise<number | null> {
    try {
      const cacheKey = `distance_${origin.lat}_${origin.lng}_${destination.lat}_${destination.lng}`;
      const cachedDistance = await AsyncStorage.getItem(cacheKey);
      
      if (cachedDistance) {
        return JSON.parse(cachedDistance);
      }

      await this.delay(500);

      const distance = await this.retryOperation(async () => {
        const response = await axios.get(
          `${this.baseUrl}/DistanceMatrix?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&vehicle=car&api_key=${this.apiKey}`
        );

        if (
          response.data.rows &&
          response.data.rows[0].elements &&
          response.data.rows[0].elements[0].distance
        ) {
          return response.data.rows[0].elements[0].distance.value / 1000;
        }
        return null;
      });

      if (distance !== null) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(distance));
      }

      return distance;
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  }

  async autoComplete(input: string): Promise<GoongAddress[]> {
    try {
      await this.delay(100);
      const response = await axios.get(
        `${this.baseUrl}/Place/AutoComplete?api_key=${this.apiKey}&input=${encodeURIComponent(input)}`
      );
      return response.data.predictions || [];
    } catch (error) {
      console.error('Error auto completing:', error);
      return [];
    }
  }
}

export const goongService = new GoongService(); 
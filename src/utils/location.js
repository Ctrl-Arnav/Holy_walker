// Location tracking utilities
import * as Location from 'expo-location';

const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds
const LOCATION_MIN_DISTANCE = 5; // 5 meters
const MAX_SPEED = 7 * 1000 / 3600; // 7 km/h in m/s
const MAX_GPS_JUMP = 50; // 50 meters

let locationSubscription = null;
let lastValidLocation = null;

/**
 * Request location permissions
 * @returns {Promise<boolean>} Permission granted
 */
export async function requestLocationPermissions() {
  try {
    console.log('Requesting foreground location permission...');
    const foreground = await Location.requestForegroundPermissionsAsync();
    console.log('Foreground permission status:', foreground.status);
    
    if (foreground.status !== 'granted') {
      console.warn('Foreground location permission denied');
      return false;
    }

    console.log('Requesting background location permission...');
    const background = await Location.requestBackgroundPermissionsAsync();
    console.log('Background permission status:', background.status);
    
    if (background.status !== 'granted') {
      console.warn('Background location permission denied');
      return false;
    }

    console.log('✓ Location permissions granted');
    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

/**
 * Validate location based on anti-cheat rules
 * @param {object} location Current location
 * @returns {boolean} Is valid
 */
function validateLocation(location) {
  const { latitude, longitude, speed, accuracy } = location.coords;

  console.log('=== LOCATION UPDATE ===');
  console.log('Lat:', latitude, 'Lng:', longitude);
  console.log('Accuracy:', accuracy, 'Speed:', speed);

  // Check GPS accuracy (more lenient for testing)
  if (accuracy > 100) {
    console.warn('GPS accuracy too low:', accuracy);
    return false;
  }

  // Check speed (ignore if speed is null/undefined or too low)
  if (speed !== null && speed > MAX_SPEED) {
    console.warn('Speed too high:', speed, 'm/s');
    return false;
  }

  // Check for sudden GPS jumps
  if (lastValidLocation) {
    const latDiff = Math.abs(latitude - lastValidLocation.latitude);
    const lngDiff = Math.abs(longitude - lastValidLocation.longitude);
    const jump = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // Rough conversion to meters

    if (jump > MAX_GPS_JUMP) {
      console.warn('GPS jump detected:', jump, 'meters');
      return false;
    }
  }

  console.log('✓ Location valid');
  return true;
}

/**
 * Start tracking location with callback
 * @param {function} onLocationUpdate Callback with location: { latitude, longitude, timestamp, speed }
 * @returns {Promise<function>} Stop tracking function
 */
export async function startLocationTracking(onLocationUpdate) {
  try {
    console.log('Starting location tracking...');
    
    // Stop existing subscription if any
    if (locationSubscription) {
      locationSubscription.remove();
    }

    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      throw new Error('Location permissions not granted');
    }

    console.log('Watching position...');
    // Start watching location
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: LOCATION_MIN_DISTANCE,
      },
      (location) => {
        console.log('Raw location received:', location.coords);
        if (validateLocation(location)) {
          lastValidLocation = location.coords;
          
          onLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: Date.now(),
            speed: location.coords.speed,
            accuracy: location.coords.accuracy
          });
        } else {
          console.log('Location validation failed, skipping update');
        }
      }
    );

    console.log('✓ Location tracking started successfully');
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
        locationSubscription = null;
      }
    };
  } catch (error) {
    console.error('Error starting location tracking:', error);
    throw error;
  }
}

/**
 * Get current location once
 * @returns {Promise<object>} { latitude, longitude, timestamp }
 */
export async function getCurrentLocation() {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    if (validateLocation(location)) {
      lastValidLocation = location.coords;
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
        speed: location.coords.speed,
      };
    } else {
      throw new Error('Location validation failed');
    }
  } catch (error) {
    console.error('Error getting current location:', error);
    throw error;
  }
}

/**
 * Stop location tracking
 */
export function stopLocationTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
}

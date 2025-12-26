import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import { db } from '../firebase/config';
import { onSnapshot, collection, updateDoc, doc } from 'firebase/firestore';
import MapView from '../components/MapView';
import HUD from '../components/HUD';
import { startLocationTracking, stopLocationTracking } from '../utils/location';
import { CaptureTracker } from '../utils/captureLogic';
import { createCapturedRegion } from '../utils/regionManager';

const MapGame = ({ userTeam, userId, onSwitchTeam }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [userPath, setUserPath] = useState([]);
  const [regions, setRegions] = useState([]);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [angleSpan, setAngleSpan] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const captureTrackerRef = useRef(new CaptureTracker());
  const locationSubscriptionRef = useRef(null);
  const uiUpdateIntervalRef = useRef(null);
  
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'regions'), (snapshot) => {
      const regionsList = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data.polygonData && typeof data.polygonData === 'string') {
          data.polygon = JSON.parse(data.polygonData);
        }
        return {
          id: doc.id,
          ...data
        };
      });
      setRegions(regionsList);
      console.log('Regions updated:', regionsList.length);
    }, (error) => {
      console.error('Error listening to regions:', error);
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const initLocationTracking = async () => {
      try {
        locationSubscriptionRef.current = await startLocationTracking((location) => {
          setUserLocation({
            latitude: location.latitude,
            longitude: location.longitude
          });

          try {
            updateDoc(doc(db, 'users', userId), {
              lastLocation: {
                lat: location.latitude,
                lng: location.longitude
              },
              lastUpdate: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error updating user location:', error);
          }
          const result = captureTrackerRef.current.addPoint(
            location.latitude,
            location.longitude,
            location.timestamp
          );
          if (result.inTerritory) {
            setUserPath(prev => [...prev, {
              latitude: location.latitude,
              longitude: location.longitude
            }].slice(-50));
          }
          if (result.captured) {
            console.log('Capture triggered via mode:', result.mode, 'angleSpan:', result.angleSpan, 'durationMs:', result.durationMs);
            handleCaptureSuccess(result.capturedPath);
          }
        });
      } catch (error) {
        console.error('Error starting location tracking:', error);
        Alert.alert('Error', 'Could not start location tracking. ' + error.message);
      }
    };
    initLocationTracking();
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current();
      }
    };
  }, [userId, userTeam]);
  useEffect(() => {
    uiUpdateIntervalRef.current = setInterval(() => {
      const tracker = captureTrackerRef.current;
      setCaptureProgress(tracker.getCaptureProgress());
      setAngleSpan(tracker.getAngleSpan());
      setElapsedTime(tracker.getElapsedTime());
    }, 500);

    return () => {
      if (uiUpdateIntervalRef.current) {
        clearInterval(uiUpdateIntervalRef.current);
      }
    };
  }, []);

  const handleCaptureSuccess = async (capturedPath) => {
    try {
      if (!capturedPath || capturedPath.length === 0) {
        console.error('No path to capture');
        return;
      }
      const regionId = await createCapturedRegion(userTeam, userId, capturedPath);
      Alert.alert('Success!', `🎉 ${userTeam} team claimed a region!\nLocked for 30 minutes.`);
      captureTrackerRef.current.reset();
    } catch (error) {
      console.error('Error creating captured region:', error);
      Alert.alert('Error', 'Failed to create region: ' + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.switchTeamBtn}
        onPress={() => {
          Alert.alert(
            'Switch Team?',
            'Your progress is saved. You can login as a different team.',
            [
              { text: 'Cancel', onPress: () => {} },
              { text: 'Switch Team', onPress: onSwitchTeam, style: 'destructive' }
            ]
          );
        }}
      >
        <Text style={styles.switchTeamText}>Switch Team</Text>
      </TouchableOpacity>
      <View style={styles.mapContainer}>
        <MapView 
          userLocation={userLocation}
          userPath={userPath}
          regions={regions}
          userTeam={userTeam}
          onReady={() => console.log('Map ready')}
        />
        <HUD
          regions={regions}
          captureProgress={captureProgress}
          angleSpan={angleSpan}
          elapsedTime={elapsedTime}
          userTeam={userTeam}
        />
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  switchTeamBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 100,
  },
  switchTeamText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default MapGame;

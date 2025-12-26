import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, SafeAreaView, TouchableOpacity, Text, Image } from 'react-native';
import { db } from '../firebase/config';
import { onSnapshot, collection, updateDoc, doc } from 'firebase/firestore';
import MapView from '../components/MapView';
import HUD from '../components/HUD';
import { startLocationTracking } from '../utils/location';
import { CaptureTracker } from '../utils/captureLogic';
import { createCapturedRegion } from '../utils/regionManager';

const MapGame = ({ userTeam, userId, onSwitchTeam }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [userPath, setUserPath] = useState([]);
  const [regions, setRegions] = useState([]);
  const [showVictory, setShowVictory] = useState(false);
  
  const captureTrackerRef = useRef(new CaptureTracker());

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'regions'), (snapshot) => {
      setRegions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), polygon: JSON.parse(doc.data().polygonData) })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const init = async () => {
      const sub = await startLocationTracking((loc) => {
        setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
        updateDoc(doc(db, 'users', userId), { lastLocation: { lat: loc.latitude, lng: loc.longitude }, lastUpdate: new Date().toISOString() });
        
        const result = captureTrackerRef.current.addPoint(loc.latitude, loc.longitude, loc.timestamp);
        if (result.inTerritory) setUserPath(prev => [...prev, { latitude: loc.latitude, longitude: loc.longitude }].slice(-50));
        if (result.captured) handleCaptureSuccess(result.capturedPath);
      });
      return () => sub();
    };
    init();
  }, [userId, userTeam]);

  const handleCaptureSuccess = async (path) => {
    await createCapturedRegion(userTeam, userId, path);
    setShowVictory(true);
    setTimeout(() => setShowVictory(false), 3000);
    captureTrackerRef.current.reset();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView userLocation={userLocation} userPath={userPath} regions={regions} userTeam={userTeam} />
        
        <TouchableOpacity style={styles.switchTeamBtn} onPress={onSwitchTeam}>
          <Image source={{ uri: 'https://i.ibb.co/6cTgQpjf/Santa-Sprite.png' }} style={styles.btnImg} resizeMode="contain" />
        </TouchableOpacity>

        <HUD regions={regions} userTeam={userTeam} />

        {showVictory && (
          <View style={styles.victoryOverlay}>
            <Text style={styles.victoryText}>REGION CAPTURED!</Text>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3893/3893113.png' }} style={{ width: 200, height: 200 }} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mapContainer: { flex: 1, position: 'relative' },
  switchTeamBtn: { position: 'absolute', bottom: 30, left: 20, zIndex: 100 },
  btnImg: { width: 60, height: 60 },
  victoryOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  victoryText: { color: 'gold', fontSize: 32, fontWeight: 'bold', marginBottom: 20 }
});

export default MapGame;

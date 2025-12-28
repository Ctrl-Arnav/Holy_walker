import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, SafeAreaView, TouchableOpacity, Text, Image, Animated } from 'react-native';
import { db } from '../firebase/config';
import { onSnapshot, collection, updateDoc, doc, increment } from 'firebase/firestore';
import MapView from '../components/MapView';
import HUD from '../components/HUD';
import { startLocationTracking } from '../utils/location';
import { CaptureTracker } from '../utils/captureLogic';
import { createCapturedRegion } from '../utils/regionManager';
import { GiftBoxManager, GIFT_BOX_SPAWN_INTERVAL } from '../utils/giftBoxManager';

const MapGame = ({ userTeam, userId, onSwitchTeam }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [userPath, setUserPath] = useState([]);
  const [regions, setRegions] = useState([]);
  const [showVictory, setShowVictory] = useState(false);
  const [giftBoxes, setGiftBoxes] = useState([]);
  const [collectedGift, setCollectedGift] = useState(null);
  const [territoryPoints, setTerritoryPoints] = useState(0);
  
  const captureTrackerRef = useRef(new CaptureTracker());
  const giftBoxManagerRef = useRef(new GiftBoxManager());
  const giftAnimValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'regions'), (snapshot) => {
      setRegions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), polygon: JSON.parse(doc.data().polygonData) })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      const newBox = giftBoxManagerRef.current.spawnGiftBox();
      if (newBox) {
        console.log('New gift box spawned:', newBox);
        setGiftBoxes(giftBoxManagerRef.current.getActiveGiftBoxes());
      }
    }, GIFT_BOX_SPAWN_INTERVAL);

    const cleanupInterval = setInterval(() => {
      giftBoxManagerRef.current.removeExpiredBoxes();
      setGiftBoxes(giftBoxManagerRef.current.getActiveGiftBoxes());
    }, 5000);

    // Spawn initial gift boxes
    console.log('Spawning initial gift boxes...');
    for (let i = 0; i < 3; i++) {
      const box = giftBoxManagerRef.current.spawnGiftBox();
      console.log('Initial box spawned:', box);
    }
    const initialBoxes = giftBoxManagerRef.current.getActiveGiftBoxes();
    console.log('Total initial gift boxes:', initialBoxes.length, initialBoxes);
    setGiftBoxes(initialBoxes);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(cleanupInterval);
    };
  }, []);

  // Fetch user's territory points
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (snapshot) => {
      const data = snapshot.data();
      setTerritoryPoints(data?.territoryPoints || 0);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      const sub = await startLocationTracking((loc) => {
        setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
        updateDoc(doc(db, 'users', userId), { lastLocation: { lat: loc.latitude, lng: loc.longitude }, lastUpdate: new Date().toISOString() });
        
        const result = captureTrackerRef.current.addPoint(loc.latitude, loc.longitude, loc.timestamp);
        if (result.inTerritory) setUserPath(prev => [...prev, { latitude: loc.latitude, longitude: loc.longitude }].slice(-50));
        if (result.captured) handleCaptureSuccess(result.capturedPath);

        // Check for gift box collection
        const collectedBox = giftBoxManagerRef.current.checkCollection(loc.latitude, loc.longitude);
        if (collectedBox) {
          handleGiftBoxCollected(collectedBox);
        }
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

  const handleGiftBoxCollected = async (giftBox) => {
    // Update gift boxes display
    setGiftBoxes(giftBoxManagerRef.current.getActiveGiftBoxes());

    // Award territory points
    await updateDoc(doc(db, 'users', userId), {
      territoryPoints: increment(giftBox.reward)
    });

    // Show collection animation
    setCollectedGift(giftBox);
    giftAnimValue.setValue(0);
    Animated.sequence([
      Animated.timing(giftAnimValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(giftAnimValue, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true
      })
    ]).start(() => setCollectedGift(null));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView 
          userLocation={userLocation} 
          userPath={userPath} 
          regions={regions} 
          userTeam={userTeam}
          giftBoxes={giftBoxes}
        />
        
        <TouchableOpacity style={styles.switchTeamBtn} onPress={onSwitchTeam}>
          <View style={[
            styles.teamBanner,
            { backgroundColor: userTeam === 'BLUE' ? 'rgba(100, 150, 255, 0.95)' : userTeam === 'GREEN' ? 'rgba(70, 200, 100, 0.95)' : 'rgba(220, 50, 50, 0.95)' }
          ]}>
            <Image 
              source={{ uri: userTeam === 'BLUE' ? 'https://i.ibb.co/FkzRdQNS/Snwmn-Sprite.png' : userTeam === 'GREEN' ? 'https://i.ibb.co/0p2DnHtH/Elf-Sprite.png' : 'https://i.ibb.co/6cTgQpjf/Santa-Sprite.png' }} 
              style={styles.teamIcon} 
              resizeMode="contain" 
            />
            <Text style={styles.teamLabel}>{userTeam}</Text>
          </View>
        </TouchableOpacity>

        <HUD regions={regions} userTeam={userTeam} territoryPoints={territoryPoints} />

        {showVictory && (
          <View style={styles.victoryOverlay}>
            <Text style={styles.victoryText}>REGION CAPTURED!</Text>
            <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3893/3893113.png' }} style={{ width: 200, height: 200 }} />
          </View>
        )}

        {collectedGift && (
          <Animated.View 
            style={[
              styles.giftCollectedOverlay,
              {
                opacity: giftAnimValue,
                transform: [
                  {
                    scale: giftAnimValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1.2]
                    })
                  }
                ]
              }
            ]}
          >
            <Image 
              source={{ uri: 'https://i.ibb.co/wdV9Zj9/gift-box.png' }} 
              style={styles.giftBoxImage} 
            />
            <Text style={styles.giftCollectedText}>+{collectedGift.reward} Territory!</Text>
            <Text style={styles.giftRarityText}>{collectedGift.rarity}</Text>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mapContainer: { flex: 1, position: 'relative' },
  switchTeamBtn: { 
    position: 'absolute', 
    bottom: 30, 
    left: 20, 
    zIndex: 100 
  },
  teamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5
  },
  teamIcon: { 
    width: 40, 
    height: 40,
    marginRight: 8
  },
  teamLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  btnImg: { width: 60, height: 60 },
  victoryOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  victoryText: { color: 'gold', fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  giftCollectedOverlay: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,215,0,0.95)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10
  },
  giftBoxImage: { width: 80, height: 80, marginBottom: 10 },
  giftCollectedText: { color: '#fff', fontSize: 28, fontWeight: 'bold', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  giftRarityText: { color: '#4a4a4a', fontSize: 16, fontWeight: '600', marginTop: 5 }
});

export default MapGame;
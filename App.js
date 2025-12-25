import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TeamSelect from './src/screens/TeamSelect';
import MapGame from './src/screens/MapGame';
import { auth } from './src/firebase/config';
import { signInAnonymously } from 'firebase/auth';

export default function App() {
  const [userTeam, setUserTeam] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedTeam = await AsyncStorage.getItem('@team');
        const savedUserId = await AsyncStorage.getItem('@userId');

        if (savedTeam && savedUserId) {
          setUserTeam(savedTeam);
          setUserId(savedUserId);
          try {
            if (!auth.currentUser) {
              await Promise.race([
                signInAnonymously(auth),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 10000))
              ]);
            }
          } catch (error) {
            console.warn('Could not restore auth session:', error);
          }
        } else {
          try {
            if (!auth.currentUser) {
              await Promise.race([
                signInAnonymously(auth),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 10000))
              ]);
            }
          } catch (error) {
            console.error('Could not sign in anonymously:', error);
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedData();
    const timeout = setTimeout(() => {
      console.warn('Loading timeout - forcing app to continue');
      setIsLoading(false);
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={{ backgroundColor: '#1a1a1a', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {userTeam && userId ? (
        <MapGame userTeam={userTeam} userId={userId} onSwitchTeam={handleReset}/>
      ) : (
        <TeamSelect onTeamSelected={handleTeamSelected} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

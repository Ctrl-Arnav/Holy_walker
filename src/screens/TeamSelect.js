import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase/config';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const TeamSelect = ({ onTeamSelected }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(false);

  const teams = [
    { name: 'RED', color: '#ff4444', label: '🔴 Santa' },
    { name: 'BLUE', color: '#4444ff', label: '🔵 Snowman' },
    { name: 'GREEN', color: '#44ff44', label: '🟢 Elf' }
  ];
  const handleTeamSelect = async (teamName) => {
    setSelectedTeam(teamName);
    setLoading(true);

    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const userId = auth.currentUser.uid;
      await AsyncStorage.setItem('@team', teamName);
      await AsyncStorage.setItem('@userId', userId);
      await setDoc(doc(db, 'users', userId), {
        team: teamName,
        lastLocation: { lat: 0, lng: 0 },
        joinedAt: new Date().toISOString(),
        isActive: true
      });
      onTeamSelected(teamName, userId);

    } catch (error) {
      console.error('Error selecting team:', error);
      Alert.alert('Error', 'Failed to select team. Please try again.');
      setLoading(false);
      setSelectedTeam(null);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🏁 Territory Walk Game</Text>
        <Text style={styles.subtitle}>Select Your Team</Text>

        <View style={styles.teamGrid}>
          {teams.map((team) => (
            <Pressable
              key={team.name}
              style={[
                styles.teamButton,
                { 
                  backgroundColor: team.color,
                  opacity: selectedTeam === team.name ? 1 : 0.7
                }
              ]}
              onPress={() => handleTeamSelect(team.name)}
              disabled={loading && selectedTeam !== team.name}
            >
              <Text style={styles.teamButtonLabel}>{team.label}</Text>
              {selectedTeam === team.name && !loading && (
                <Text style={styles.checkmark}>✓</Text>
              )}
              {selectedTeam === team.name && loading && (
                <Text style={styles.loading}>...</Text>
              )}
            </Pressable>
          ))}
        </View>
        <Text style={styles.instructions}>
          Join a team and start walking to control the territory!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: '#aaa',
    marginBottom: 40,
  },
  teamGrid: {
    gap: 16,
    marginBottom: 40,
  },
  teamButton: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamButtonLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  checkmark: {
    fontSize: 24,
    color: '#fff',
  },
  loading: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 20,
  },
});

export default TeamSelect;

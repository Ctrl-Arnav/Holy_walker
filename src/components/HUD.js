import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import * as turf from '@turf/turf';
import { TERRITORY_POLYGON } from '../utils/geo';

const { width } = Dimensions.get('window');

const HUD = ({ 
  regions = [],
  captureProgress, 
  userTeam 
}) => {
  // Your Custom Button URLs
  const TEAM_BUTTONS = {
    RED: "https://i.ibb.co/Tq8WMcQ0/Red-Team.png",
    BLUE: "https://i.ibb.co/d0zDhxkD/Blue-Team.png",
    GREEN: "https://i.ibb.co/bMM01d27/Green-Team.png",
  };

  const teamColors = { RED: '#ff4444', BLUE: '#4444ff', GREEN: '#44ff44' };

  // Area Control Calculations
  const regionsByTeam = {};
  regions.forEach(r => {
    if (!regionsByTeam[r.ownerTeam]) regionsByTeam[r.ownerTeam] = 0;
    regionsByTeam[r.ownerTeam]++;
  });

  const userRegionCount = regionsByTeam[userTeam] || 0;
  const territoryArea = turf.area(TERRITORY_POLYGON) || 1;
  const areaByTeam = { RED: 0, BLUE: 0, GREEN: 0 };
  
  regions.forEach((r) => {
    if (!r.polygon) return;
    try {
      const regionPoly = turf.polygon(r.polygon.coordinates);
      const intersection = turf.intersect(regionPoly, TERRITORY_POLYGON);
      if (!intersection) return;
      areaByTeam[r.ownerTeam] += turf.area(intersection);
    } catch (e) { console.warn('Area calc failed', e); }
  });

  const percent = {
    RED: Math.min(100, Math.round((areaByTeam.RED / territoryArea) * 1000) / 10),
    BLUE: Math.min(100, Math.round((areaByTeam.BLUE / territoryArea) * 1000) / 10),
    GREEN: Math.min(100, Math.round((areaByTeam.GREEN / territoryArea) * 1000) / 10),
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {/* CLAIMED REGIONS */}
      <View style={styles.infoBox}>
        <Text style={styles.label}>Claimed Regions</Text>
        <View style={styles.badgeWrapper}>
          <Image source={{ uri: TEAM_BUTTONS[userTeam] }} style={styles.badgeImage} resizeMode="stretch" />
          <View style={styles.textOverlay}>
            <Text style={styles.ownerText}>{userTeam}: {userRegionCount}</Text>
          </View>
        </View>
        <Text style={styles.points}>Total: {regions.length}</Text>
      </View>

      {/* CAPTURE PROGRESS */}
      <View style={styles.progressBox}>
        <Text style={styles.label}>Capture Progress</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${captureProgress * 100}%` }]} />
        </View>
      </View>

      {/* YOUR TEAM */}
      <View style={styles.teamBox}>
        <Text style={styles.label}>Your Team</Text>
        <View style={styles.badgeWrapper}>
          <Image source={{ uri: TEAM_BUTTONS[userTeam] }} style={styles.badgeImage} resizeMode="stretch" />
          <View style={styles.textOverlay}>
            <Text style={styles.teamText}>{userTeam}</Text>
          </View>
        </View>
      </View>

      {/* AREA CONTROL BOX */}
      <View style={styles.verdictBox}>
        <Text style={styles.label}>Area Control</Text>
        {['RED', 'BLUE', 'GREEN'].map(team => (
          <View key={team} style={styles.verdictRow}>
            <Text style={[styles.verdictTeam, { color: teamColors[team] }]}>{team}</Text>
            <Text style={styles.verdictValue}>{percent[team]}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 35,
    left: 10,
    right: 10,
    zIndex: 100,
  },
  infoBox: { marginBottom: 10 },
  label: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
  badgeWrapper: {
    width: width * 0.65,
    height: 40,
    justifyContent: 'center',
  },
  badgeImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
  },
  textOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  teamText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  points: { color: '#4caf50', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  
  progressBox: { marginBottom: 10 },
  progressBar: {
    width: width * 0.65,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff', // White "Snow" Fill
    shadowColor: '#fff',
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },

  teamBox: { marginBottom: 10 },
  
  verdictBox: {
    position: 'absolute',
    top: 130, // Positioned below the other boxes
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    minWidth: 110,
  },
  verdictRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  verdictTeam: { fontWeight: '900', fontSize: 11 },
  verdictValue: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default HUD;

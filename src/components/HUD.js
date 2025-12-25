import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as turf from '@turf/turf';
import { TERRITORY_POLYGON } from '../utils/geo';

const HUD = ({ 
  regions = [],
  captureProgress, 
  angleSpan, 
  elapsedTime,
  userTeam 
}) => {
  const teamColors = {
    RED: '#ff4444',
    BLUE: '#4444ff',
    GREEN: '#44ff44'
  };
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
      const interArea = turf.area(intersection);
      areaByTeam[r.ownerTeam] = (areaByTeam[r.ownerTeam] || 0) + interArea;
    } catch (e) {
      console.warn('Area calc failed for region', r.id, e);
    }
  });
  const percent = {
    RED: Math.min(100, Math.round((areaByTeam.RED / territoryArea) * 1000) / 10),
    BLUE: Math.min(100, Math.round((areaByTeam.BLUE / territoryArea) * 1000) / 10),
    GREEN: Math.min(100, Math.round((areaByTeam.GREEN / territoryArea) * 1000) / 10),
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <Text style={styles.label}>Claimed Regions</Text>
        <View style={[styles.ownerBadge, { backgroundColor: teamColors[userTeam] }]}>
          <Text style={styles.ownerText}>{userTeam}: {userRegionCount}</Text>
        </View>
        <Text style={styles.points}>Total: {regions.length}</Text>
      </View>
      <View style={styles.progressBox}>
        <Text style={styles.label}>Capture Progress</Text>
        {captureProgress > 0 && (
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Overall: {Math.floor(captureProgress * 100)}%</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${captureProgress * 100}%`, backgroundColor: '#4caf50' }
                ]} 
              />
            </View>
          </View>
        )}
      </View>
      <View style={styles.teamBox}>
        <Text style={styles.label}>Your Team</Text>
        <View style={[styles.teamBadge, { backgroundColor: teamColors[userTeam] || '#ccc' }]}>
          <Text style={styles.teamText}>{userTeam || 'NONE'}</Text>
        </View>
      </View>
        <View style={styles.verdictBox}>
          <Text style={styles.label}>Area Control</Text>
          <View style={styles.verdictRow}>
            <Text style={[styles.verdictTeam, { color: teamColors.RED }]}>RED</Text>
            <Text style={styles.verdictValue}>{percent.RED}%</Text>
          </View>
          <View style={styles.verdictRow}>
            <Text style={[styles.verdictTeam, { color: teamColors.BLUE }]}>BLUE</Text>
            <Text style={styles.verdictValue}>{percent.BLUE}%</Text>
          </View>
          <View style={styles.verdictRow}>
            <Text style={[styles.verdictTeam, { color: teamColors.GREEN }]}>GREEN</Text>
            <Text style={styles.verdictValue}>{percent.GREEN}%</Text>
          </View>
        </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 100,
    flexDirection: 'column',
    gap: 10,
  },
  infoBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  ownerBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 6,
  },
  ownerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  points: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  progressItem: {
    marginBottom: 10,
  },
  progressLabel: {
    color: '#fff',
    fontSize: 11,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  teamBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
  },
  teamBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  teamText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  verdictBox: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    minWidth: 120,
  },
  verdictRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  verdictTeam: {
    fontWeight: '700',
    fontSize: 12,
  },
  verdictValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
export default HUD;

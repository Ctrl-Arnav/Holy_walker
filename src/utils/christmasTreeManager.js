import * as turf from '@turf/turf';
import { TERRITORY_POLYGON, isPointInTerritory, getDistanceBetweenPoints } from './geo';

export const CHRISTMAS_TREE_SPAWN_INTERVAL = 45000; 
export const CHRISTMAS_TREE_LIFETIME = 180000; // 3 minutes
export const CHRISTMAS_TREE_COLLECTION_RADIUS = 20;
export const MAX_ACTIVE_TREES = 8;
export const MIN_TREE_DISTANCE = 60; 

export class ChristmasTreeManager {
  constructor() {
    this.activeTrees = [];
    this.nextId = 0;
  }

  generateRandomPointInTerritory() {
    const bbox = turf.bbox(TERRITORY_POLYGON);
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const randomLat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
      const randomLng = bbox[0] + Math.random() * (bbox[2] - bbox[0]);

      if (isPointInTerritory(randomLat, randomLng)) {
        const tooClose = this.activeTrees.some(tree => {
          const dist = getDistanceBetweenPoints(randomLat, randomLng, tree.lat, tree.lng);
          return dist < MIN_TREE_DISTANCE;
        });

        if (!tooClose) {
          return { lat: randomLat, lng: randomLng };
        }
      }
      attempts++;
    }
    const center = turf.centroid(TERRITORY_POLYGON);
    return {
      lat: center.geometry.coordinates[1],
      lng: center.geometry.coordinates[0]
    };
  }

  spawnChristmasTree() {
    if (this.activeTrees.length >= MAX_ACTIVE_TREES) {
      return null;
    }
    const position = this.generateRandomPointInTerritory();
    const now = Date.now();
    const tree = {
      id: `tree-${this.nextId++}`,
      lat: position.lat,
      lng: position.lng,
      spawnTime: now,
      expiryTime: now + CHRISTMAS_TREE_LIFETIME
    };

    this.activeTrees.push(tree);
    return tree;
  }

  checkCollection(playerLat, playerLng) {
    for (let i = 0; i < this.activeTrees.length; i++) {
      const tree = this.activeTrees[i];
      const distance = getDistanceBetweenPoints(playerLat, playerLng, tree.lat, tree.lng);
      
      if (distance <= CHRISTMAS_TREE_COLLECTION_RADIUS) {
        this.activeTrees.splice(i, 1);
        return tree;
      }
    }
    return null;
  }

  removeExpiredTrees() {
    const now = Date.now();
    const initialLength = this.activeTrees.length;
    this.activeTrees = this.activeTrees.filter(tree => tree.expiryTime > now);
    return initialLength - this.activeTrees.length;
  }

  getActiveTrees() {
    return [...this.activeTrees];
  }

  reset() {
    this.activeTrees = [];
  }
}

import * as turf from '@turf/turf';
import { TERRITORY_POLYGON, isPointInTerritory, getDistanceBetweenPoints } from './geo';

export const GIFT_BOX_SPAWN_INTERVAL = 30000; 
export const GIFT_BOX_LIFETIME = 120000; 
export const GIFT_BOX_COLLECTION_RADIUS = 15;
export const MAX_ACTIVE_GIFT_BOXES = 10;
export const MIN_GIFT_BOX_DISTANCE = 50; 
export const GIFT_BOX_REWARDS = {
  COMMON: { min: 5, max: 15, weight: 60 },
  RARE: { min: 20, max: 40, weight: 30 },
  EPIC: { min: 50, max: 100, weight: 10 }
};
export class GiftBoxManager {
  constructor() {
    this.activeGiftBoxes = [];
    this.nextId = 0;
  }

  /**
   * @returns {{lat: number, lng: number}}
   */
  generateRandomPointInTerritory() {
    const bbox = turf.bbox(TERRITORY_POLYGON);
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const randomLat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
      const randomLng = bbox[0] + Math.random() * (bbox[2] - bbox[0]);

      if (isPointInTerritory(randomLat, randomLng)) {
        const tooClose = this.activeGiftBoxes.some(box => {
          const dist = getDistanceBetweenPoints(randomLat, randomLng, box.lat, box.lng);
          return dist < MIN_GIFT_BOX_DISTANCE;
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

  /**
   * @returns {string}
   */
  getRandomRarity() {
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const [rarity, config] of Object.entries(GIFT_BOX_REWARDS)) {
      cumulative += config.weight;
      if (rand <= cumulative) {
        return rarity;
      }
    }
    return 'COMMON';
  }

  /**
   * @param {string} rarity
   * @returns {number}
   */
  calculateReward(rarity) {
    const config = GIFT_BOX_REWARDS[rarity];
    return Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
  }

  /**
   * Spawn a new gift box
   * @returns {object|null}
   */
  spawnGiftBox() {
    if (this.activeGiftBoxes.length >= MAX_ACTIVE_GIFT_BOXES) {
      return null;
    }
    const position = this.generateRandomPointInTerritory();
    const rarity = this.getRandomRarity();
    const reward = this.calculateReward(rarity);
    const now = Date.now();
    const giftBox = {
      id: `gift-${this.nextId++}`,
      lat: position.lat,
      lng: position.lng,
      rarity,
      reward,
      spawnTime: now,
      expiryTime: now + GIFT_BOX_LIFETIME
    };

    this.activeGiftBoxes.push(giftBox);
    return giftBox;
  }

  /**
   * @param {number} playerLat
   * @param {number} playerLng
   * @returns {object|null}
   */
  checkCollection(playerLat, playerLng) {
    const now = Date.now();
    
    for (let i = 0; i < this.activeGiftBoxes.length; i++) {
      const box = this.activeGiftBoxes[i];
      const distance = getDistanceBetweenPoints(playerLat, playerLng, box.lat, box.lng);
      
      if (distance <= GIFT_BOX_COLLECTION_RADIUS) {
        // Remove from active boxes
        this.activeGiftBoxes.splice(i, 1);
        return box;
      }
    }
    
    return null;
  }

  /**
   * @returns {number} Number of boxes removed
   */
  removeExpiredBoxes() {
    const now = Date.now();
    const initialLength = this.activeGiftBoxes.length;
    
    this.activeGiftBoxes = this.activeGiftBoxes.filter(box => box.expiryTime > now);
    
    return initialLength - this.activeGiftBoxes.length;
  }
  /**
   * @returns {Array}
   */
  getActiveGiftBoxes() {
    return [...this.activeGiftBoxes];
  }
  reset() {
    this.activeGiftBoxes = [];
  }
}

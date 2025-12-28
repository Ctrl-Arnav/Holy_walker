// Capture logic for territory control
import { getAngleFromCenter, isPointInTerritory, TERRITORY_POLYGON } from './geo';
import * as turf from '@turf/turf';

export const CAPTURE_ANGLE_THRESHOLD=160;
export const CAPTURE_MIN_DURATION=60000;
export const HOLD_INTERVAL=10000;
export const HOLD_POINTS_PER_INTERVAL=10;
export const LOOP_CLOSE_DISTANCE_METERS=30; 
export const MIN_LOOP_POINTS=6;
export const MIN_LOOP_DURATION_MS=30000;
export const MIN_LOOP_INTERSECTION_RATIO=0.10;
export const MIN_LOOP_AREA_M2=100;

export class CaptureTracker {
  constructor() {
    this.pathPoints=[]; 
    this.entryTime=null;
    this.minAngle=null;
    this.maxAngle=null;
  }
  /**
   * @param {number} lat
   * @param {number} lng
   * @param {number} timestamp
   * @returns {object} { captured: boolean, angleSpan: number, durationMs: number }
   */
  addPoint(lat, lng, timestamp) {
    const inTerritory=isPointInTerritory(lat, lng);
    
    if (!inTerritory) {
      this.reset();
      return { captured: false, angleSpan: 0, durationMs: 0 };
    }
    if (this.entryTime === null) {
      this.entryTime=timestamp;
      this.minAngle=null;
      this.maxAngle=null;
    }

    const angle=getAngleFromCenter(lat, lng);
    const durationMs=timestamp - this.entryTime;
    if (this.minAngle === null) {
      this.minAngle=angle;
      this.maxAngle=angle;
    }
    this.updateAngleBounds(angle);
    this.pathPoints.push({
      lat,
      lng,
      timestamp,
      angle
    });
    const twoMinutesAgo=timestamp - 180000;
    this.pathPoints=this.pathPoints.filter(p => p.timestamp >= twoMinutesAgo);
    const angleSpan=this.getAngleSpan();
    const angleCapture=angleSpan >= CAPTURE_ANGLE_THRESHOLD && durationMs >= CAPTURE_MIN_DURATION;
    const loopCapture=this.checkLoopCapture();

    const captured=angleCapture || loopCapture;

    return {
      captured,
      angleSpan,
      durationMs,
      inTerritory: true,
      mode: angleCapture ? 'angle' : (loopCapture ? 'loop' : null),
      capturedPath: captured ? this.pathPoints : null
    };
  }
  updateAngleBounds(angle) {
    this.minAngle=Math.min(this.minAngle, angle);
    this.maxAngle=Math.max(this.maxAngle, angle);
  }
  getAngleSpan() {
    if (!this.pathPoints.length) return 0;
    const angles=this.pathPoints.map(p => p.angle).sort((a, b) => a - b);
    if (angles.length === 1) return 0;
    let maxGap=0;
    for (let i=1; i < angles.length; i++) {
      const gap=angles[i] - angles[i - 1];
      if (gap > maxGap) maxGap=gap;
    }
    const wrapGap=360 - angles[angles.length - 1] + angles[0];
    if (wrapGap > maxGap) maxGap=wrapGap;
    return Math.max(0, 360 - maxGap);
  }
  getPathGeoJSON() {
    return this.pathPoints.map(p => [p.lng, p.lat]);
  }

  checkLoopCapture() {
    if (this.pathPoints.length < MIN_LOOP_POINTS || !this.entryTime) {
      console.log('Loop: not enough points (' + this.pathPoints.length + ') or no entryTime');
      return false;
    }

    const durationMs=Date.now() - this.entryTime;
    if (durationMs < MIN_LOOP_DURATION_MS) {
      console.log('Loop: duration too short:', Math.round(durationMs/1000) + 's < ' + (MIN_LOOP_DURATION_MS/1000) + 's');
      return false;
    }
    const first=this.pathPoints[0];
    const last=this.pathPoints[this.pathPoints.length - 1];

    const d=turf.distance(
      turf.point([first.lng, first.lat]),
      turf.point([last.lng, last.lat]),
      { units: 'meters' }
    );
    console.log('Loop: closure distance =', Math.round(d) + 'm (threshold ' + LOOP_CLOSE_DISTANCE_METERS + 'm)');
    if (d > LOOP_CLOSE_DISTANCE_METERS) {
      console.log('Loop: NOT CLOSED');
      return false;
    }
    const ring=this.getPathGeoJSON();
    ring.push(ring[0]);
    const userPoly=turf.polygon([ring]);
    const userArea=turf.area(userPoly);
    console.log('Loop: area =', Math.round(userArea) + ' m² (threshold ' + MIN_LOOP_AREA_M2 + ' m²)');
    if (userArea < MIN_LOOP_AREA_M2) {
      console.log('Loop: area too small');
      return false;
    }
    console.log('LOOP CAPTURE TRIGGERED - Region claimed!');
    return true;
  }
  reset() {
    this.pathPoints=[];
    this.entryTime=null;
    this.minAngle=null;
    this.maxAngle=null;
  }
  isCapturing() {
    return this.entryTime !== null;
  }
  getElapsedTime() {
    if (!this.entryTime) return 0;
    return Date.now() - this.entryTime;
  }
  getCaptureProgress() {
    const elapsed=this.getElapsedTime();
    const angleSpan=this.getAngleSpan();
    const timeProgress=Math.min(elapsed / CAPTURE_MIN_DURATION, 1);
    const angleProgress=Math.min(angleSpan / CAPTURE_ANGLE_THRESHOLD, 1);
    return Math.min(timeProgress, angleProgress);
  }
}
export class HoldTracker {
  constructor(ownerTeam) {
    this.ownerTeam=ownerTeam;
    this.points=0;
    this.lastUpdate=Date.now();
  }

  /**
   * @param {string} currentOwner Current owner team
   * @returns {object} {updated:boolean,pointsAdded:number}
   */
  updateHold(currentOwner) {
    const now=Date.now();
    const timeSinceLastUpdate=now - this.lastUpdate;
    if (timeSinceLastUpdate >= HOLD_INTERVAL) {
      const pointsToAdd=HOLD_POINTS_PER_INTERVAL;
      this.points += pointsToAdd;
      this.lastUpdate=now;
      return { updated: true, pointsAdded: pointsToAdd };
    }
    return { updated: false, pointsAdded: 0 };
  }
  reset() {
    this.points=0;
    this.lastUpdate=Date.now();
  }
}

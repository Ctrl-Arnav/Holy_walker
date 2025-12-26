import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { TERRITORY_POLYGON } from '../utils/geo';

const MapView = React.forwardRef(({ 
  userLocation, 
  userPath, 
  regions = [],
  userTeam = "RED",
  onReady 
}, ref) => {
  const webViewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const generateLeafletHTML = () => {
    const bounds = TERRITORY_POLYGON.geometry.coordinates[0];
    const centerLat = (bounds[0][1] + bounds[2][1]) / 2;
    const centerLng = (bounds[0][0] + bounds[2][0]) / 2;

    const RED_PNG = "https://i.ibb.co/6cTgQpjf/Santa-Sprite.png";
    const GREEN_PNG = "https://i.ibb.co/68X66fT/Elf-Sprite.png"; // Replace with actual
    const BLUE_PNG = "https://i.ibb.co/m0vH5dK/Snowman-Sprite.png"; // Replace with actual

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <style>
          * { margin: 0; padding: 0; }
          body { overflow: hidden; background: #001a33; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; z-index: 1; }

          /* SNOW ANIMATION */
          .snow-container {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            z-index: 1000;
            overflow: hidden;
          }
          .snowflake {
            position: absolute;
            top: -10px;
            color: white;
            user-select: none;
            animation-name: fall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
          @keyframes fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0.3; }
          }
        </style>
      </head>
      <body>
        <div class="snow-container" id="snow"></div>
        <div id="map"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
        <script>
          let mapInstance = null;
          let userMarker = null;
          let userPolyline = null;
          let regionLayers = {};

          const teamConfigs = {
            RED: { icon: L.icon({ iconUrl: '${RED_PNG}', iconSize: [50, 50], iconAnchor: [25, 25] }), trailColor: '#ff4444' },
            GREEN: { icon: L.icon({ iconUrl: '${GREEN_PNG}', iconSize: [50, 50], iconAnchor: [25, 25] }), trailColor: '#44ff44' },
            BLUE: { icon: L.icon({ iconUrl: '${BLUE_PNG}', iconSize: [50, 50], iconAnchor: [25, 25] }), trailColor: '#4444ff' }
          };

          function createSnow() {
            const container = document.getElementById('snow');
            for (let i = 0; i < 30; i++) {
              const flake = document.createElement('div');
              flake.className = 'snowflake';
              flake.innerHTML = '❄';
              flake.style.left = Math.random() * 100 + 'vw';
              flake.style.animationDuration = (Math.random() * 3 + 2) + 's';
              flake.style.opacity = Math.random();
              flake.style.fontSize = (Math.random() * 10 + 10) + 'px';
              flake.style.animationDelay = Math.random() * 5 + 's';
              container.appendChild(flake);
            }
          }

          function initializeMap() {
            if (mapInstance) return;
            mapInstance = L.map('map').setView([${centerLat}, ${centerLng}], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
            createSnow();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
          }

          window.handleMapUpdate = function(data) {
            if (!mapInstance) initializeMap();
            const config = teamConfigs[data.userTeam] || teamConfigs.RED;

            if (data.userLocation && data.userLocation.latitude) {
              const pos = [data.userLocation.latitude, data.userLocation.longitude];
              if (!userMarker) {
                userMarker = L.marker(pos, { icon: config.icon }).addTo(mapInstance);
              } else {
                userMarker.setLatLng(pos).setIcon(config.icon);
              }
              mapInstance.panTo(pos);
            }

            if (data.userPath && data.userPath.length > 0) {
              if (userPolyline) mapInstance.removeLayer(userPolyline);
              userPolyline = L.polyline(data.userPath.map(p => [p.latitude, p.longitude]), 
                { color: config.trailColor, weight: 4, opacity: 0.8, dashArray: '10, 10' }).addTo(mapInstance);
            }

            data.regions.forEach(region => {
              const rColor = (teamConfigs[region.ownerTeam] || teamConfigs.RED).trailColor;
              if (regionLayers[region.id]) {
                regionLayers[region.id].setStyle({ color: rColor, fillColor: rColor });
              } else {
                regionLayers[region.id] = L.geoJSON(region.polygon, { style: { color: rColor, weight: 2, fillOpacity: 0.3 } }).addTo(mapInstance);
              }
            });
          };

          window.addEventListener('load', initializeMap);
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    if (webViewRef.current && mapReady) {
      webViewRef.current.injectJavaScript(`window.handleMapUpdate(${JSON.stringify({ userLocation, userPath, regions, userTeam })}); true;`);
    }
  }, [userLocation, userPath, regions, userTeam, mapReady]);

  return (
    <View style={styles.container}>
      <WebView ref={webViewRef} originWhitelist={['*']} source={{ html: generateLeafletHTML() }}
        onMessage={(e) => JSON.parse(e.nativeEvent.data).type === 'MAP_READY' && setMapReady(true)}
        style={{ flex: 1 }} javaScriptEnabled={true} />
    </View>
  );
});

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#fff' } });
export default MapView;

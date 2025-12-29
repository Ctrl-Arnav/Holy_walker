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
    const GREEN_PNG = "https://i.ibb.co/0p2DnHtH/Elf-Sprite.png";
    const BLUE_PNG = "https://i.ibb.co/FkzRdQNS/Snwmn-Sprite.png";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
        <style>
          * { margin: 0; padding: 0; }
          body { overflow: hidden; background: #1a1a1a; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; z-index: 1; }

          .snow-container {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            z-index: 9999;
            overflow: hidden;
          }
          .snowflake {
            position: absolute;
            top: -20px;
            color: white;
            text-shadow: 0 0 5px rgba(0,0,0,0.8);
            user-select: none;
            animation-name: fall;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
          @keyframes fall {
            0% { transform: translateY(-5vh) translateX(0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translateY(105vh) translateX(25px) rotate(360deg); opacity: 0; }
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
          let emojiPatterns = {};

          const teamConfigs = {
            RED: { emoji: '🎁', color: '#ff4444', icon: '${RED_PNG}' },
            GREEN: { emoji: '🎄', color: '#2ECC71', icon: '${GREEN_PNG}' },
            BLUE: { emoji: '☃️', color: '#3498DB', icon: '${BLUE_PNG}' }
          };

          // Function to create a repeating emoji texture using Canvas
          function createEmojiPattern(emoji) {
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            const ctx = canvas.getContext('2d');
            ctx.font = '20px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.3; // Make them subtle
            ctx.fillText(emoji, 20, 20);
            return ctx.createPattern(canvas, 'repeat');
          }

          function createSnow() {
            const container = document.getElementById('snow');
            for (let i = 0; i < 30; i++) {
              const flake = document.createElement('div');
              flake.className = 'snowflake';
              flake.innerHTML = '❄';
              flake.style.left = Math.random() * 100 + 'vw';
              flake.style.animationDuration = (Math.random() * 5 + 3) + 's';
              flake.style.fontSize = (Math.random() * 15 + 10) + 'px';
              flake.style.animationDelay = Math.random() * 10 + 's';
              container.appendChild(flake);
            }
          }

          function initializeMap() {
            if (mapInstance) return;
            mapInstance = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], 16);
            
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance);

            // Pre-create emoji patterns
            emojiPatterns.RED = createEmojiPattern(teamConfigs.RED.emoji);
            emojiPatterns.GREEN = createEmojiPattern(teamConfigs.GREEN.emoji);
            emojiPatterns.BLUE = createEmojiPattern(teamConfigs.BLUE.emoji);

            createSnow();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
          }

          window.handleMapUpdate = function(data) {
            if (!mapInstance) initializeMap();
            
            const team = data.userTeam || 'RED';
            const config = teamConfigs[team];

            // Update Marker
            const leafIcon = L.icon({ iconUrl: config.icon, iconSize: [55, 55], iconAnchor: [27, 27] });
            if (data.userLocation && data.userLocation.latitude) {
              const pos = [data.userLocation.latitude, data.userLocation.longitude];
              if (!userMarker) {
                userMarker = L.marker(pos, { icon: leafIcon }).addTo(mapInstance);
              } else {
                userMarker.setLatLng(pos).setIcon(leafIcon);
              }
              mapInstance.panTo(pos);
            }

            // Update Trail
            if (data.userPath && data.userPath.length > 0) {
              if (userPolyline) mapInstance.removeLayer(userPolyline);
              userPolyline = L.polyline(data.userPath.map(p => [p.latitude, p.longitude]), 
                { color: config.color, weight: 5, opacity: 0.8, dashArray: '5, 10' }).addTo(mapInstance);
            }

            // Update Regions with Emoji Fill
            data.regions.forEach(region => {
              const rTeam = region.ownerTeam || 'RED';
              const rColor = teamConfigs[rTeam].color;
              
              const style = { 
                color: rColor, 
                weight: 2, 
                fillColor: rColor, // Fallback color
                fillOpacity: 0.4
              };

              if (regionLayers[region.id]) {
                regionLayers[region.id].setStyle(style);
              } else {
                const layer = L.geoJSON(region.polygon, { style }).addTo(mapInstance);
                
                // Hack to apply Canvas pattern to Leaflet Path
                if (layer.getLayers()[0]._path) {
                    layer.getLayers()[0]._path.setAttribute('fill', emojiPatterns[rTeam]);
                }
                regionLayers[region.id] = layer;
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
      <WebView 
        ref={webViewRef} 
        originWhitelist={['*']} 
        source={{ html: generateLeafletHTML() }}
        onMessage={(e) => JSON.parse(e.nativeEvent.data).type === 'MAP_READY' && setMapReady(true)}
        style={{ flex: 1 }} 
        javaScriptEnabled={true} 
      />
    </View>
  );
});

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#1a1a1a' } });
export default MapView;

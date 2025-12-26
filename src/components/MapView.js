import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { TERRITORY_POLYGON } from '../utils/geo';

const MapView = React.forwardRef(({ 
  userLocation, 
  userPath, 
  regions = [],
  userTeam = "RED", // Defaulting to RED (Santa), pass this from your App.js/State
  onReady 
}, ref) => {
  const webViewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const generateLeafletHTML = () => {
    const bounds = TERRITORY_POLYGON.geometry.coordinates[0];
    const centerLat = (bounds[0][1] + bounds[2][1]) / 2;
    const centerLng = (bounds[0][0] + bounds[2][0]) / 2;

    // --- PASTE YOUR URLS HERE ---
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
          body { overflow: hidden; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
        <script>
          let mapInstance = null;
          let userMarker = null;
          let userPolyline = null;
          let regionLayers = {}; 

          // Configure Team Assets
          const teamConfigs = {
            RED: {
              icon: L.icon({ iconUrl: '${RED_PNG}', iconSize: [50, 50], iconAnchor: [25, 25] }),
              trailColor: '#ff4444'
            },
            GREEN: {
              icon: L.icon({ iconUrl: '${GREEN_PNG}', iconSize: [50, 50], iconAnchor: [25, 25] }),
              trailColor: '#44ff44'
            },
            BLUE: {
              icon: L.icon({ iconUrl: '${BLUE_PNG}', iconSize: [50, 50], iconAnchor: [25, 25] }),
              trailColor: '#4444ff'
            }
          };

          function initializeMap() {
            if (mapInstance) return;
            mapInstance = L.map('map').setView([${centerLat}, ${centerLng}], 16);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OSM contributors',
              maxZoom: 19
            }).addTo(mapInstance);

            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
          }

          window.handleMapUpdate = function(data) {
            if (!mapInstance) initializeMap();

            const team = data.userTeam || 'RED';
            const config = teamConfigs[team] || teamConfigs.RED;

            // 1. Update User Sprite (The Walker)
            if (data.userLocation && data.userLocation.latitude !== null) {
              const { latitude, longitude } = data.userLocation;
              if (!userMarker) {
                userMarker = L.marker([latitude, longitude], { icon: config.icon }).addTo(mapInstance);
              } else {
                userMarker.setLatLng([latitude, longitude]);
                userMarker.setIcon(config.icon);
              }               
              mapInstance.panTo([latitude, longitude]);
            }

            // 2. Update Trail (Matches Team Color)
            if (data.userPath && data.userPath.length > 0) {
              if (userPolyline) mapInstance.removeLayer(userPolyline);
              userPolyline = L.polyline(
                data.userPath.map(p => [p.latitude, p.longitude]),
                { 
                  color: config.trailColor, 
                  weight: 4, 
                  opacity: 0.8, 
                  dashArray: '10, 10' 
                }
              ).addTo(mapInstance);
            }

            // 3. Update Conquered Regions
            if (data.regions) {
              data.regions.forEach(region => {
                const regionColor = (teamConfigs[region.ownerTeam] || teamConfigs.RED).trailColor;
                
                if (regionLayers[region.id]) {
                  regionLayers[region.id].setStyle({ color: regionColor, fillColor: regionColor });
                } else {
                  regionLayers[region.id] = L.geoJSON(region.polygon, {
                    style: {
                      color: regionColor,
                      weight: 2,
                      fillOpacity: 0.3
                    }
                  }).addTo(mapInstance);
                }
              });
            }
          };

          window.addEventListener('load', initializeMap);
        </script>
      </body>
      </html>
    `;
  };

  const html = generateLeafletHTML();

  useEffect(() => {
    if (webViewRef.current && mapReady) {
      const messageData = {
        userLocation: userLocation,
        userPath: userPath || [],
        regions: regions || [],
        userTeam: userTeam // Sends the team string to the WebView
      };
      webViewRef.current.injectJavaScript(`
        window.handleMapUpdate(${JSON.stringify(messageData)});
        true;
      `);
    }
  }, [userLocation, userPath, regions, userTeam, mapReady]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'MAP_READY') {
              setMapReady(true);
              if (onReady) onReady();
            }
          } catch (error) {
            console.error('Error parsing WebView message:', error);
          }
        }}
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default MapView;

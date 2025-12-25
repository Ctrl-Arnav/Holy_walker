import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { TERRITORY_POLYGON } from '../utils/geo';
const MapView = React.forwardRef(({ 
  userLocation, 
  userPath, 
  regions = [],
  onReady 
}, ref) => {
  const webViewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const generateLeafletHTML = () => {
    const bounds = TERRITORY_POLYGON.geometry.coordinates[0];
    const centerLat = (bounds[0][1] + bounds[2][1]) / 2;
    const centerLng = (bounds[0][0] + bounds[2][0]) / 2;
    return ``
}
  const html = generateLeafletHTML();
  useEffect(() => {
    if (webViewRef.current && mapReady) {
      const messageData = {
        userLocation: userLocation,
        userPath: userPath || [],
        regions: regions || []
      };
      console.log('Sending map update with', regions.length, 'regions');
      webViewRef.current.injectJavaScript(`
        window.handleMapUpdate(${JSON.stringify(messageData)});
        true;
      `);
    }
  }, [userLocation, userPath, regions, mapReady]);
  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('WebView message:', data);
            if (data.type === 'MAP_READY') {
              console.log('✓ Map is ready!');
              setMapReady(true);
              if (onReady) {
                onReady();
              }
            }
          } catch (error) {
            console.error('Error parsing WebView message:', error);
          }
        }}
        style={{ flex: 1 }}
        scrollEnabled={true}
        zoomEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
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

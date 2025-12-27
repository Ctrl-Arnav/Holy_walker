export const COLLEGE_TERRITORY = {
  type: "Feature",
  properties: {
    name: "College Campus",
    region: "India"
  },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [78.01822303234167, 27.1864330440241],
      [78.01822303234167, 27.184198996847442],
      [78.02335645519469, 27.184198996847442],
      [78.02335645519469, 27.1864330440241],
      [78.01822303234167, 27.1864330440241]
    ]]
  }
};
export const TERRITORY_CENTER = {
  latitude: 27.18531602043577,
  longitude: 78.02078974376818
};
export const TERRITORY_BOUNDS = {
  minLat: 27.184198996847442,
  maxLat: 27.1864330440241,
  minLng: 78.01822303234167,
  maxLng: 78.02335645519469
};
export const TERRITORY_SIZE = {
  widthMeters: 508,   // East-West
  heightMeters: 248,  // North-South
  areaSquareKm: 0.13
};

import * as THREE from 'three';

/**
 * Converts areocentric latitude/longitude (in degrees) to 3D Cartesian coordinates
 * aligned with Three.js SphereGeometry UV mapping:
 * - u = 0.5 + lonDeg / 360 (0 deg prime meridian at +X)
 * - v = 0.5 + latDeg / 180 (+90 deg North Pole at +Y)
 * - Eastward (+lon) rotates counter-clockwise around +Y (toward -Z at +90 E).
 */
export function latLonToVector3(
  latDeg: number,
  lonDeg: number,
  radius: number,
  target = new THREE.Vector3()
): THREE.Vector3 {
  const latRad = THREE.MathUtils.degToRad(latDeg);
  const lonRad = THREE.MathUtils.degToRad(lonDeg);
  const cosLat = Math.cos(latRad);

  return target.set(
    radius * cosLat * Math.cos(lonRad),
    radius * Math.sin(latRad),
    -radius * cosLat * Math.sin(lonRad)
  );
}

/**
 * Converts a 3D point on or near the sphere back to approximate areocentric coordinates.
 */
export function vector3ToLatLon(vec: THREE.Vector3): { latDeg: number; lonDeg: number } {
  const len = vec.length() || 1;
  const latDeg = THREE.MathUtils.radToDeg(
    Math.asin(THREE.MathUtils.clamp(vec.y / len, -1, 1))
  );
  const lonDeg = THREE.MathUtils.radToDeg(Math.atan2(-vec.z, vec.x));
  return { latDeg, lonDeg };
}

export function formatAreocentricCoordinates(latDeg: number, lonDeg: number): string {
  const latDir = latDeg >= 0 ? 'N' : 'S';
  const lonDir = lonDeg >= 0 ? 'E' : 'W';
  return `${Math.abs(latDeg).toFixed(1)}° ${latDir}, ${Math.abs(lonDeg).toFixed(1)}° ${lonDir}`;
}

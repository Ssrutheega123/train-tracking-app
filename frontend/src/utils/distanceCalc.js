/**
 * distanceCalc.js
 * Haversine Formula — calculates the great-circle distance between
 * two points on Earth's surface given their latitude/longitude in decimal degrees.
 *
 * Returns distance in KILOMETERS.
 *
 * Formula:
 *   a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
 *   c = 2·atan2(√a, √(1−a))
 *   d = R·c
 * where R = 6371 km (Earth's mean radius)
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number} radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Calculates the distance between two GPS coordinates using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1 (decimal degrees)
 * @param {number} lon1 - Longitude of point 1 (decimal degrees)
 * @param {number} lat2 - Latitude of point 2 (decimal degrees)
 * @param {number} lon2 - Longitude of point 2 (decimal degrees)
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
        return Infinity;
    }

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
}

/**
 * Returns a human-friendly string of the distance.
 * @param {number} km - Distance in kilometers
 * @returns {string}
 */
export function formatDistance(km) {
    if (km === Infinity || isNaN(km)) return '—';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(2)} km`;
    return `${Math.round(km)} km`;
}

/**
 * Returns the alarm state based on distance to destination.
 *
 * @param {number} distToDestKm
 * @param {number} distToPrevKm
 * @returns {'safe'|'approaching'|'pre-alert'|'alarm'}
 */
export function getAlarmState(distToDestKm, distToPrevKm) {
    if (distToDestKm <= 2) return 'alarm';          // Within 2 km of destination → RING!
    if (distToPrevKm <= 0.5) return 'pre-alert';    // Within 500 m of previous station → vibrate
    if (distToDestKm <= 15) return 'approaching';   // Within 15 km → show warning
    return 'safe';
}

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useGeolocation — Custom hook that wraps navigator.geolocation.watchPosition
 *
 * Features:
 * - Adaptive accuracy: uses high accuracy when close to destination, lower otherwise
 * - Error handling with user-friendly messages
 * - Supports demo/simulation mode for testing without physical travel
 */

const HIGH_ACCURACY_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,           // Accept positions up to 5s old
};

const LOW_ACCURACY_OPTIONS = {
    enableHighAccuracy: false,
    timeout: 30000,
    maximumAge: 60000,          // Accept positions up to 1 min old (saves battery)
};

export function useGeolocation({ distanceToDestKm = Infinity, isTracking = false }) {
    const [position, setPosition] = useState(null);
    const [error, setError] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const watchIdRef = useRef(null);

    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    const startWatching = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        // Adaptive accuracy: use high accuracy only when within 50 km
        const options = distanceToDestKm < 50 ? HIGH_ACCURACY_OPTIONS : LOW_ACCURACY_OPTIONS;

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                setPosition({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    timestamp: pos.timestamp,
                });
                setAccuracy(pos.coords.accuracy);
                setError(null);
            },
            (err) => {
                const messages = {
                    1: 'Location permission denied. Please allow location access in your browser settings.',
                    2: 'Location unavailable. Check your GPS or network connection.',
                    3: 'Location request timed out. Retrying...',
                };
                setError(messages[err.code] || 'Unknown location error.');
            },
            options
        );
    }, [distanceToDestKm]);

    useEffect(() => {
        if (isTracking) {
            stopWatching();    // Clear old watcher first
            startWatching();   // Start new one with potentially updated options
        } else {
            stopWatching();
        }

        return stopWatching;
    }, [isTracking, startWatching, stopWatching]);

    return { position, error, accuracy };
}

/**
 * useSimulatedGeolocation — Simulates a train journey for demo/testing
 *
 * @param {Array} stations - Array of {latitude, longitude} station objects
 * @param {boolean} isActive - Whether simulation is running
 * @param {number} speedMultiplier - How fast to simulate (default: real-time would be very slow, so we use 100x)
 */
export function useSimulatedGeolocation({ stations, isActive, speedMultiplier = 200 }) {
    const [position, setPosition] = useState(null);
    const [currentSegment, setCurrentSegment] = useState(0);
    const [progress, setProgress] = useState(0); // 0 to 1 within current segment
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!isActive || !stations || stations.length < 2) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setPosition(null);
            setCurrentSegment(0);
            setProgress(0);
            return;
        }

        // Reset to start
        setCurrentSegment(0);
        setProgress(0);

        const STEPS_PER_SEGMENT = 100;  // 100 steps between each pair of stations
        const INTERVAL_MS = 5000 / speedMultiplier; // Time per step

        let seg = 0;
        let step = 0;

        intervalRef.current = setInterval(() => {
            if (seg >= stations.length - 1) {
                clearInterval(intervalRef.current);
                return;
            }

            const from = stations[seg];
            const to = stations[seg + 1];

            if (!from?.latitude || !to?.latitude) {
                seg++;
                step = 0;
                return;
            }

            const t = step / STEPS_PER_SEGMENT;
            const lat = from.latitude + (to.latitude - from.latitude) * t;
            const lon = from.longitude + (to.longitude - from.longitude) * t;

            setPosition({ lat, lon, timestamp: Date.now() });
            setCurrentSegment(seg);
            setProgress(t);

            step++;
            if (step > STEPS_PER_SEGMENT) {
                step = 0;
                seg++;
            }
        }, INTERVAL_MS);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, stations, speedMultiplier]);

    return { position, currentSegment, progress };
}

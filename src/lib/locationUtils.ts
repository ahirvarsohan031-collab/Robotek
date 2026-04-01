/**
 * Location Utilities for Attendance System
 */

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const λ1 = lon1 * Math.PI / 180;
    const λ2 = lon2 * Math.PI / 180;

    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);
    const brng = (θ * 180 / Math.PI + 360) % 360; // in degrees
    return brng;
}

export function getCompassDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
}

/**
 * Parses a string of coordinates. 
 * Supports: 
 * - JSON array: '[{"name":"Office","coords":"lat,long"}, ...]'
 * - Single point: "lat,long"
 * - Multi point: "lat1,long1;lat2,long2;..."
 */
export function parseLatLong(lateLongStr: string | undefined): { lat: number, long: number, name?: string }[] | null {
    if (!lateLongStr) return null;
    
    try {
        // Try JSON array format first: [{"name":"...", "coords":"lat,long"}, ...]
        if (lateLongStr.trim().startsWith('[') || lateLongStr.trim().startsWith('{')) {
            const parsed = JSON.parse(lateLongStr);
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            const points = arr
                .filter((entry: any) => entry.coords)
                .map((entry: any) => {
                    const [lat, long] = entry.coords.split(',').map((c: string) => parseFloat(c.trim()));
                    if (isNaN(lat) || isNaN(long)) return null;
                    return { lat, long, name: entry.name || 'Location' };
                })
                .filter(Boolean) as { lat: number, long: number, name?: string }[];
            return points.length > 0 ? points : null;
        }

        // Fallback: semicolon-separated "lat,long;lat,long"
        const points = lateLongStr.split(';').filter(p => p.trim());
        const parsedPoints = points.map((point, index) => {
            const [lat, long] = point.split(',').map(coord => parseFloat(coord.trim()));
            if (isNaN(lat) || isNaN(long)) throw new Error('Invalid coordinate format');
            return { lat, long, name: `Location ${index + 1}` };
        });
        
        return parsedPoints.length > 0 ? parsedPoints : null;
    } catch (e) {
        console.error('Error parsing coordinates:', e);
        return null;
    }
}

/**
 * Returns the shortest distance if multiple points are provided.
 */
export function getShortestDistance(currentLat: number, currentLng: number, points: { lat: number, long: number, name?: string }[]): { distance: number, point: { lat: number, long: number, name?: string } } {
    let minDistance = Infinity;
    let closestPoint = points[0];

    points.forEach(point => {
        const d = calculateDistance(currentLat, currentLng, point.lat, point.long);
        if (d < minDistance) {
            minDistance = d;
            closestPoint = point;
        }
    });

    return { distance: minDistance, point: closestPoint };
}

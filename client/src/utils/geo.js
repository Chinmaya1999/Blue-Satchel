// Browser GPS location, or null if the user declines / it's unavailable.
// Never rejects — callers fall back (the server uses the request IP).
export const getBrowserLocation = ({ timeout = 10000 } = {}) =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 5 * 60 * 1000 }
    );
  });

export const directionsUrl = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const formatPlace = (loc) =>
  loc ? [loc.city, loc.region, loc.country].filter(Boolean).join(", ") || loc.displayName || null : null;

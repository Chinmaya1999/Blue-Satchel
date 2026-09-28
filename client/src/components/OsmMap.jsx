import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * OpenStreetMap via Leaflet. Markers are circle markers (no image assets to
 * bundle). `markers`: [{ lat, lng, popup (HTML string), color, primary }].
 * The map fits all markers; a lone marker is shown at `zoom`.
 */
const OsmMap = ({ markers = [], zoom = 13, className = "h-72" }) => {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    map.current = L.map(el.current, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);

  useEffect(() => {
    layer.current.clearLayers();
    const points = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
    for (const m of points) {
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: m.primary ? 9 : 7,
        color: "#ffffff",
        weight: 2,
        fillColor: m.color || (m.primary ? "#0891b2" : "#e11d48"),
        fillOpacity: 0.95,
      }).addTo(layer.current);
      if (m.popup) marker.bindPopup(m.popup);
    }
    if (points.length === 1) map.current.setView([points[0].lat, points[0].lng], zoom);
    else if (points.length > 1) map.current.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [30, 30], maxZoom: 15 });
    else map.current.setView([22.5, 79], 4); // India
  }, [markers, zoom]);

  return <div ref={el} className={`relative z-0 w-full overflow-hidden rounded-2xl ring-1 ring-white/10 ${className}`} />;
};

// Escape text before putting it into a Leaflet popup (popups take HTML).
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export default OsmMap;

import { useEffect, useRef } from "react";
import "./MapView.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_API_KEY;
const DEFAULT_LAT = 18.9388;
const DEFAULT_LNG = 72.8257;

const LEVEL_COLOR = { LOW: "#00D4AA", MEDIUM: "#FF6B35", HIGH: "#FF4444" };

const isValid = (la, lo) =>
  typeof la === "number" && typeof lo === "number" &&
  !isNaN(la) && !isNaN(lo) &&
  la >= -90 && la <= 90 && lo >= -180 && lo <= 180;

export default function MapView({ lat, lng, logs = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const heatMarkersRef = useRef([]);

  useEffect(() => {
    if (window.google) { initMap(); return; }
    if (document.getElementById("gmaps-script")) return;
    const script = document.createElement("script");
    script.id = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !isValid(lat, lng)) return;
    const pos = { lat, lng };
    mapInstanceRef.current.panTo(pos);
    if (markerRef.current) markerRef.current.setPosition(pos);
  }, [lat, lng]);

  // Draw heatmap dots whenever logs change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    // Clear old heat markers
    heatMarkersRef.current.forEach((m) => m.setMap(null));
    heatMarkersRef.current = [];
    logs.forEach((log) => {
      if (!isValid(log.lat, log.lng)) return;
      const color = LEVEL_COLOR[log.level] || "#FF6B35";
      const circle = new window.google.maps.Circle({
        map: mapInstanceRef.current,
        center: { lat: log.lat, lng: log.lng },
        radius: 80,
        fillColor: color,
        fillOpacity: 0.35,
        strokeColor: color,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
      });
      heatMarkersRef.current.push(circle);
    });
  }, [logs]);

  const initMap = () => {
    const safeLat = isValid(lat, lng) ? lat : DEFAULT_LAT;
    const safeLng = isValid(lat, lng) ? lng : DEFAULT_LNG;
    const pos = { lat: safeLat, lng: safeLng };

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: pos,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
    });

    markerRef.current = new window.google.maps.Marker({
      position: pos,
      map: mapInstanceRef.current,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#FF6B35",
        fillOpacity: 1,
        strokeColor: "#FF6B35",
        strokeOpacity: 0.3,
        strokeWeight: 8,
      },
    });
  };

  const displayLat = isValid(lat, lng) ? lat.toFixed(4) : "—";
  const displayLng = isValid(lat, lng) ? lng.toFixed(4) : "—";

  return (
    <div className="map-container">
      <div ref={mapRef} className="map-canvas" />
      <div className="map-coord-tag">{displayLat}°N · {displayLng}°E</div>
      <div className="map-label">LOCATION PREVIEW</div>
      {logs.length > 0 && (
        <div className="map-legend">
          <span className="legend-dot" style={{ background: "#00D4AA" }} />LOW
          <span className="legend-dot" style={{ background: "#FF6B35" }} />MED
          <span className="legend-dot" style={{ background: "#FF4444" }} />HIGH
        </div>
      )}
    </div>
  );
}
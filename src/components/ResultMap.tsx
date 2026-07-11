import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Coordinate } from "../game/types";
import { DEFAULT_ZOOM, OSAKA_CENTER, OSM_ATTRIBUTION, OSM_TILE_URL } from "./mapConfig";
type Props = { guess: Coordinate; answer: Coordinate };
export function ResultMap({ guess, answer }: Props) {
  const elementRef = useRef<HTMLDivElement>(null), mapRef = useRef<L.Map | null>(null), layerRef = useRef<L.LayerGroup | null>(null);
  useEffect(() => { if (!elementRef.current) return; const map = L.map(elementRef.current, { zoomControl: false, dragging: false, scrollWheelZoom: false }).setView(OSAKA_CENTER, DEFAULT_ZOOM); mapRef.current = map; L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map); return () => { map.remove(); mapRef.current = null; layerRef.current = null; }; }, []);
  useEffect(() => { const map = mapRef.current; if (!map) return; layerRef.current?.remove(); const group = L.layerGroup([L.marker([guess.lat, guess.lng], { title: "あなたの推測" }), L.marker([answer.lat, answer.lng], { title: "正解" }), L.polyline([[guess.lat, guess.lng], [answer.lat, answer.lng]], { color: "#ffb000", weight: 3, dashArray: "8 8" })]).addTo(map); layerRef.current = group; map.fitBounds(L.latLngBounds([[guess.lat, guess.lng], [answer.lat, answer.lng]]).pad(0.25)); }, [guess, answer]);
  return <div ref={elementRef} className="map-canvas result-map" aria-label="結果地図" />;
}

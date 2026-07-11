import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Coordinate } from "../game/types";
import { DEFAULT_ZOOM, OSAKA_CENTER, OSM_ATTRIBUTION, OSM_TILE_URL } from "./mapConfig";

type Props = { guess: Coordinate | null; onGuess: (point: Coordinate) => void };
export function GuessMap({ guess, onGuess }: Props) {
  const elementRef = useRef<HTMLDivElement>(null), mapRef = useRef<L.Map | null>(null), markerRef = useRef<L.Marker | null>(null), handlerRef = useRef(onGuess);
  useEffect(() => { handlerRef.current = onGuess; }, [onGuess]);
  useEffect(() => {
    if (!elementRef.current) return;
    const map = L.map(elementRef.current, { zoomControl: false }).setView(OSAKA_CENTER, DEFAULT_ZOOM);
    mapRef.current = map; L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    const click = (event: L.LeafletMouseEvent) => handlerRef.current({ lat: event.latlng.lat, lng: event.latlng.lng }); map.on("click", click);
    return () => { map.off("click", click); map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);
  useEffect(() => { const map = mapRef.current; if (!map) return; if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; } if (guess) markerRef.current = L.marker([guess.lat, guess.lng], { title: "あなたのピン" }).addTo(map); }, [guess]);
  return <div ref={elementRef} className="map-canvas" aria-label="推測用地図" />;
}

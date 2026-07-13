import { useEffect, useRef } from "react";
import { GOOGLE_MAP_BASE_OPTIONS } from "../config/maps";
import type { Coordinate } from "../game/types";
import type { GoogleMapsApi, GoogleMapInstance, GoogleMarkerInstance, GooglePolylineInstance } from "../maps/googleTypes";

type Props = { googleMaps: GoogleMapsApi; guess: Coordinate; answer: Coordinate };

export function GoogleResultMap({ googleMaps, guess, answer }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);
  const lineRef = useRef<GooglePolylineInstance | null>(null);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    mapRef.current = new googleMaps.Map(elementRef.current, {
      ...GOOGLE_MAP_BASE_OPTIONS,
      center: answer,
      zoom: 10,
      gestureHandling: "none",
    });
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      lineRef.current?.setMap(null);
      markersRef.current = [];
      lineRef.current = null;
      mapRef.current = null;
    };
  }, [googleMaps]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    lineRef.current?.setMap(null);
    const guessMarker = new googleMaps.Marker({ map, position: guess, title: "あなたの推測", label: "G" });
    const answerMarker = new googleMaps.Marker({ map, position: answer, title: "正解", label: "A" });
    const line = new googleMaps.Polyline({ map, path: [guess, answer], geodesic: true, strokeColor: "#ffb000", strokeOpacity: 0.9, strokeWeight: 3 });
    markersRef.current = [guessMarker, answerMarker];
    lineRef.current = line;
    const bounds = new googleMaps.LatLngBounds();
    bounds.extend(guess);
    bounds.extend(answer);
    map.fitBounds(bounds, 48);
  }, [answer, googleMaps, guess]);

  return <div ref={elementRef} className="map-canvas result-map google-map-canvas" aria-label="結果地図" />;
}

import { useEffect, useRef } from "react";
import { GOOGLE_MAP_BASE_OPTIONS, OSAKA_CENTER } from "../config/maps";
import type { Coordinate } from "../game/types";
import { toCoordinate } from "../maps/googleTypes";
import type { GoogleMapsApi, GoogleMapInstance, GoogleMarkerInstance, GoogleMapsEventListener } from "../maps/googleTypes";

type Props = { googleMaps: GoogleMapsApi; guess: Coordinate | null; onGuess: (point: Coordinate) => void };

export function GoogleGuessMap({ googleMaps, guess, onGuess }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const clickListenerRef = useRef<GoogleMapsEventListener | null>(null);
  const onGuessRef = useRef(onGuess);

  useEffect(() => {
    onGuessRef.current = onGuess;
  }, [onGuess]);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return;
    const map = new googleMaps.Map(elementRef.current, {
      ...GOOGLE_MAP_BASE_OPTIONS,
      center: OSAKA_CENTER,
      zoom: 10,
    });
    mapRef.current = map;
    clickListenerRef.current = map.addListener("click", (event) => {
      if (event?.latLng) onGuessRef.current(toCoordinate(event.latLng));
    });

    return () => {
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [googleMaps]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerRef.current?.setMap(null);
    markerRef.current = guess ? new googleMaps.Marker({ map, position: guess, title: "あなたのピン" }) : null;
  }, [googleMaps, guess]);

  return <div ref={elementRef} className="map-canvas google-map-canvas" aria-label="推測用地図" />;
}

import { useEffect, useRef, useState } from "react";
import { GOOGLE_PANORAMA_OPTIONS } from "../config/maps";
import type { Coordinate } from "../game/types";
import type { GoogleMapsApi, GoogleMapsEventListener } from "../maps/googleTypes";

const LOAD_TIMEOUT_MS = 15000;

type Props = {
  googleMaps: GoogleMapsApi;
  panoId: string;
  coordinate: Coordinate;
  title: string;
  onFailure: () => void;
};

export function StreetViewViewer({ googleMaps, panoId, coordinate, title, onFailure }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<InstanceType<GoogleMapsApi["StreetViewPanorama"]> | null>(null);
  const listenersRef = useRef<GoogleMapsEventListener[]>([]);
  const failureRef = useRef(false);
  const pendingLoadRef = useRef(false);
  const onFailureRef = useRef(onFailure);
  const timeoutRef = useRef<number | undefined>(undefined);
  const [state, setState] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    onFailureRef.current = onFailure;
  }, [onFailure]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const panorama = panoramaRef.current ?? new googleMaps.StreetViewPanorama(element, GOOGLE_PANORAMA_OPTIONS);
    panoramaRef.current = panorama;
    googleMaps.event.clearInstanceListeners(panorama);
    listenersRef.current = [
      panorama.addListener("status_changed", () => {
        if (!pendingLoadRef.current) return;
        const status = panorama.getStatus();
        if (status === googleMaps.StreetViewStatus.OK) {
          pendingLoadRef.current = false;
          setState("ready");
        } else if (status === googleMaps.StreetViewStatus.UNKNOWN_ERROR) {
          pendingLoadRef.current = false;
          if (!failureRef.current) {
            failureRef.current = true;
            onFailureRef.current();
          }
        }
      }),
    ];

    return () => {
      listenersRef.current.forEach((listener) => listener.remove());
      listenersRef.current = [];
      window.clearTimeout(timeoutRef.current);
    };
  }, [googleMaps]);

  useEffect(() => {
    const panorama = panoramaRef.current;
    if (!panorama) return;
    failureRef.current = false;
    pendingLoadRef.current = true;
    setState("loading");
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      if (!pendingLoadRef.current || failureRef.current) return;
      pendingLoadRef.current = false;
      failureRef.current = true;
      onFailureRef.current();
    }, LOAD_TIMEOUT_MS);
    panorama.setPosition(coordinate);
    panorama.setPano(panoId);
    panorama.setVisible(true);

    return () => {
      window.clearTimeout(timeoutRef.current);
      pendingLoadRef.current = false;
    };
  }, [coordinate, panoId]);

  return (
    <div className="street-view-viewer" aria-label={title}>
      {state === "loading" && (
        <div className="photo-loading" role="status" aria-live="polite">
          <span className="scanline" />
          <p>大阪の街を探しています…</p>
        </div>
      )}
      <div ref={elementRef} className={`street-view-canvas ${state}`} />
      <span className="photo-corner top" />
      <span className="photo-corner bottom" />
      <span className="panorama-badge">MOVE FREELY / LOOK CLOSE</span>
    </div>
  );
}

import type { Coordinate } from "../game/types";

export type GoogleLatLng = { lat(): number; lng(): number } | Coordinate;
export type GoogleMapOptions = {
  center: Coordinate;
  zoom: number;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
  clickableIcons?: boolean;
  gestureHandling?: string;
};
export type GoogleMarkerOptions = { map: GoogleMapInstance | null; position?: Coordinate; title?: string; label?: string };
export type GooglePolylineOptions = { map: GoogleMapInstance; path: Coordinate[]; geodesic?: boolean; strokeColor?: string; strokeOpacity?: number; strokeWeight?: number };
export type GoogleStreetViewPanoramaOptions = {
  addressControl: boolean;
  showRoadLabels: boolean;
  clickToGo: boolean;
  linksControl: boolean;
  fullscreenControl: boolean;
  motionTrackingControl: boolean;
  enableCloseButton: boolean;
  panControl: boolean;
  zoomControl: boolean;
  visible: boolean;
};
export type GoogleStreetViewPanoramaData = {
  pano?: string;
  location?: { latLng?: GoogleLatLng };
};
export type GoogleStreetViewStatus = "OK" | "ZERO_RESULTS" | "UNKNOWN_ERROR" | string;

export function toCoordinate(point: GoogleLatLng): Coordinate {
  return { lat: typeof point.lat === "function" ? point.lat() : point.lat, lng: typeof point.lng === "function" ? point.lng() : point.lng };
}

export interface GoogleMapsEventListener {
  remove(): void;
}

export interface GoogleMapInstance {
  addListener(eventName: string, handler: (event?: { latLng?: GoogleLatLng }) => void): GoogleMapsEventListener;
  fitBounds(bounds: GoogleLatLngBoundsInstance, padding?: number): void;
}

export interface GoogleMarkerInstance {
  setMap(map: GoogleMapInstance | null): void;
  setPosition(position: Coordinate): void;
}

export interface GooglePolylineInstance {
  setMap(map: GoogleMapInstance | null): void;
}

export interface GoogleLatLngBoundsInstance {
  extend(point: Coordinate): void;
}

export interface GoogleStreetViewPanoramaInstance {
  addListener(eventName: string, handler: () => void): GoogleMapsEventListener;
  getStatus(): GoogleStreetViewStatus;
  setPano(panoId: string): void;
  setPosition(position: Coordinate): void;
  setVisible(visible: boolean): void;
}

export type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMapInstance;
  Marker: new (options: GoogleMarkerOptions) => GoogleMarkerInstance;
  Polyline: new (options: GooglePolylineOptions) => GooglePolylineInstance;
  LatLngBounds: new () => GoogleLatLngBoundsInstance;
  StreetViewService: new () => {
    getPanorama(
      request: { location: Coordinate; radius: number; preference: string; sources: string[] },
      callback: (data: GoogleStreetViewPanoramaData | null, status: GoogleStreetViewStatus) => void,
    ): void;
  };
  StreetViewPanorama: new (element: HTMLElement, options: GoogleStreetViewPanoramaOptions) => GoogleStreetViewPanoramaInstance;
  StreetViewPreference: { NEAREST: string };
  StreetViewSource: { GOOGLE: string; OUTDOOR: string };
  StreetViewStatus: { OK: string; ZERO_RESULTS: string; UNKNOWN_ERROR: string };
  event: { clearInstanceListeners(instance: unknown): void };
};

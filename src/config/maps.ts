import type { Coordinate } from "../game/types";
import type { GoogleMapOptions, GoogleStreetViewPanoramaOptions } from "../maps/googleTypes";

export const GOOGLE_MAPS_OPTIONS = {
  version: "quarterly",
  language: "ja",
  region: "JP",
} as const;

export const OSAKA_CENTER: Coordinate = { lat: 34.69, lng: 135.52 };

export const GOOGLE_MAP_BASE_OPTIONS: Omit<GoogleMapOptions, "center" | "zoom"> = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

export const GOOGLE_PANORAMA_OPTIONS: GoogleStreetViewPanoramaOptions = {
  addressControl: false,
  showRoadLabels: false,
  clickToGo: true,
  linksControl: true,
  fullscreenControl: false,
  motionTrackingControl: false,
  enableCloseButton: false,
  panControl: true,
  zoomControl: true,
  visible: true,
};

export function getGoogleMapsApiKey(): string | null {
  const value = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  return value || null;
}

import { GOOGLE_MAPS_OPTIONS } from "../config/maps";
import type { GoogleMapsApi } from "./googleTypes";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let loadedKey: string | null = null;
let loaderPromise: Promise<GoogleMapsApi> | null = null;

export class GoogleMapsInitializationError extends Error {
  constructor() {
    super("Google Maps could not be initialized");
    this.name = "GoogleMapsInitializationError";
  }
}

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  const normalizedKey = apiKey.trim();
  if (!normalizedKey) return Promise.reject(new Error("Google Maps API key is empty"));
  if (loaderPromise && loadedKey === normalizedKey) return loaderPromise;

  loadedKey = normalizedKey;
  loaderPromise = Promise.resolve()
    .then(() => {
      setOptions({ key: normalizedKey, ...GOOGLE_MAPS_OPTIONS });
      return Promise.all([importLibrary("maps"), importLibrary("streetView")]);
    })
    .then(() => {
      const maps = (globalThis as typeof globalThis & { google?: { maps?: GoogleMapsApi } }).google?.maps;
      if (!maps) throw new Error("Google Maps API did not initialize");
      return maps;
    })
    .catch((error) => {
      loadedKey = null;
      loaderPromise = null;
      if (error instanceof GoogleMapsInitializationError) throw error;
      throw new GoogleMapsInitializationError();
    });
  return loaderPromise;
}

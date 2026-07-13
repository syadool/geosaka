import type { Coordinate } from "../game/types";
import type { GoogleMapsApi, GoogleStreetViewPanoramaData } from "./googleTypes";

export type StreetViewSearchRequest = {
  location: Coordinate;
  radius: 500;
};

export class NoPanoramaError extends Error {
  constructor() {
    super("No Street View panorama found");
    this.name = "NoPanoramaError";
  }
}

export class StreetViewSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreetViewSearchError";
  }
}

export class TransientStreetViewError extends StreetViewSearchError {
  constructor(message: string) {
    super(message);
    this.name = "TransientStreetViewError";
  }
}

export function createStreetViewSearchClient(googleMaps: GoogleMapsApi) {
  const service = new googleMaps.StreetViewService();

  return {
    getPanorama(request: StreetViewSearchRequest): Promise<GoogleStreetViewPanoramaData> {
      return new Promise((resolve, reject) => {
        service.getPanorama(
          {
            location: request.location,
            radius: request.radius,
            preference: googleMaps.StreetViewPreference.NEAREST,
            sources: [googleMaps.StreetViewSource.GOOGLE, googleMaps.StreetViewSource.OUTDOOR],
          },
          (data, status) => {
            if (status === googleMaps.StreetViewStatus.OK && data) {
              resolve(data);
              return;
            }
            if (status === googleMaps.StreetViewStatus.ZERO_RESULTS) {
              reject(new NoPanoramaError());
              return;
            }
            if (status === googleMaps.StreetViewStatus.UNKNOWN_ERROR) {
              reject(new TransientStreetViewError("Street View search temporarily failed"));
              return;
            }
            reject(new StreetViewSearchError(`Street View search failed: ${status}`));
          },
        );
      });
    },
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { loadGoogleMaps } from "../src/maps/googleMapsLoader";

describe("loadGoogleMaps", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("passes the browser API key using the loader's key option", async () => {
    const maps = { marker: "loaded" };
    vi.stubGlobal("google", { maps });

    await expect(loadGoogleMaps("  test-browser-key  ")).resolves.toBe(maps);

    expect(setOptions).toHaveBeenCalledWith({
      key: "test-browser-key",
      version: "quarterly",
      language: "ja",
      region: "JP",
    });
    expect(importLibrary).toHaveBeenCalledWith("maps");
    expect(importLibrary).toHaveBeenCalledWith("streetView");
  });
});

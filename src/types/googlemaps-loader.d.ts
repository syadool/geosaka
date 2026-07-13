declare module "@googlemaps/js-api-loader" {
  export function setOptions(options: Record<string, string>): void;
  export function importLibrary(name: "maps" | "streetView"): Promise<unknown>;
}

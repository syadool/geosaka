import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Unit tests must not change behavior based on a developer's local browser API key.
vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");

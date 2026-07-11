import { fireEvent, render, screen } from "@testing-library/react";
import { vi, expect, it } from "vitest";
vi.mock("../src/components/GuessMap", () => ({ GuessMap: ({ onGuess }: { onGuess: (p: { lat: number; lng: number }) => void }) => <button onClick={() => onGuess({ lat: 34.6873, lng: 135.5262 })}>mock map pin</button> }));
vi.mock("../src/components/PhotoViewer", () => ({ PhotoViewer: () => <div>mock photo</div> }));
import { RoundScreen } from "../src/components/RoundScreen";
import { StaticPhotoSceneProvider } from "../src/scene/StaticPhotoSceneProvider";
it("keeps confirmation unavailable until the mocked Leaflet boundary supplies a pin", async () => { const scene = (await new StaticPhotoSceneProvider().getAvailableScenes())[0]; let guess: { lat: number; lng: number } | null = null; const { rerender } = render(<RoundScreen scene={scene} round={1} total={5} guess={guess} score={0} onGuess={(point) => { guess = point; }} onConfirm={vi.fn()} onPhotoFailure={vi.fn()} />); expect(screen.getByRole("button", { name: /推測を確定/ })).toBeDisabled(); fireEvent.click(screen.getByText("mock map pin")); rerender(<RoundScreen scene={scene} round={1} total={5} guess={guess} score={0} onGuess={() => {}} onConfirm={vi.fn()} onPhotoFailure={vi.fn()} />); expect(screen.getByRole("button", { name: /推測を確定/ })).toBeEnabled(); });

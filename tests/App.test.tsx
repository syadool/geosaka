import { fireEvent, render, screen } from "@testing-library/react";
import { vi, expect, it } from "vitest";
vi.mock("../src/components/GuessMap", () => ({ GuessMap: ({ onGuess }: { onGuess: (p: { lat: number; lng: number }) => void }) => <button onClick={() => onGuess({ lat: 34.6873, lng: 135.5262 })}>mock Leaflet pin</button> }));
vi.mock("../src/components/ResultMap", () => ({ ResultMap: () => <div>mock Leaflet result</div> }));
vi.mock("../src/components/PhotoViewer", () => ({ PhotoViewer: () => <div>mock photo ready</div> }));
import App from "../src/App";
it("moves from a confirmed guess to a result, and shows a total after five rounds", async () => { render(<App />); fireEvent.click(screen.getByRole("button", { name: /5 ROUND/ })); for (let i = 0; i < 5; i += 1) { fireEvent.click(await screen.findByText("mock Leaflet pin")); fireEvent.click(screen.getByRole("button", { name: /推測を確定/ })); expect(await screen.findByText(/YOUR SCORE/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: i === 4 ? /最終結果を見る/ : /次のラウンドへ/ })); } expect(await screen.findByText(/TOTAL SCORE/)).toBeInTheDocument(); });

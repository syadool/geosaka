import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { RoundResult } from "../src/game/types";

vi.mock("../src/components/ResultMap", () => ({ ResultMap: () => <div>mock result map</div> }));

import { RoundResultScreen } from "../src/components/RoundResultScreen";

const result: RoundResult = {
  roundNumber: 1,
  scene: {
    id: "osaka-castle",
    location: { lat: 34.6873, lng: 135.5262 },
    display: { kind: "photo", imageUrl: "https://example.com/photo.jpg", alt: "天守" },
    reveal: { nameJa: "大阪城天守閣", descriptionJa: "大阪を象徴する天守閣。", credit: { author: "Test", licenseName: "CC0", sourceUrl: "https://example.com/source" } },
    difficulty: "easy",
  },
  guess: { lat: 34.68, lng: 135.52 },
  answer: { lat: 34.6873, lng: 135.5262 },
  distanceKm: 1,
  score: 3000,
};

it("offers Street View only from the revealed round result", () => {
  render(<RoundResultScreen result={result} final={false} onNext={vi.fn()} />);

  expect(screen.getByRole("link", { name: "大阪城天守閣 周辺のストリートビューを Google マップで開く" })).toHaveAttribute("href", expect.stringContaining("viewpoint=34.6873%2C135.5262"));
});

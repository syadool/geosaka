import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { StreetViewLink } from "../src/components/StreetViewLink";

it("renders a safe, accessible external Street View link", () => {
  render(<StreetViewLink coordinate={{ lat: 34.6873, lng: 135.5262 }} placeName="大阪城天守閣" />);

  const link = screen.getByRole("link", { name: "大阪城天守閣 周辺のストリートビューを Google マップで開く" });
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(link).toHaveAttribute("href", expect.stringContaining("map_action=pano"));
});

it("keeps the result screen safe when a coordinate is invalid", () => {
  render(<StreetViewLink coordinate={{ lat: Number.NaN, lng: 135.5262 }} placeName="不正な地点" />);

  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("ストリートビューのリンクを作成できません。");
});

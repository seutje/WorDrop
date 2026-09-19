import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("navigates between the Phase 0 placeholder pages", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Closet" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    expect(
      screen.getByRole("heading", { name: "Outfits" }),
    ).toBeInTheDocument();
  });
});

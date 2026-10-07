import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WearHistory } from "./WearHistory";
import { localDate } from "../lib/wearHistory";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  record: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("../lib/database/wearRepository", () => ({ wearRepository: mocks }));
const outfitWear = {
  id: "wear",
  wornOn: "2020-01-01",
  outfitId: "outfit",
  itemIds: ["piece"],
  sourceName: "Weekend",
  isOutfit: true,
  createdAt: "",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.list.mockResolvedValue([]);
  mocks.record.mockResolvedValue(undefined);
  mocks.delete.mockResolvedValue(undefined);
});
afterEach(cleanup);

it("records the selected outfit date and refreshes its history", async () => {
  const user = userEvent.setup();
  render(<WearHistory targetId="outfit" isOutfit />);
  await screen.findByText("No wears recorded yet.");
  mocks.list.mockResolvedValue([{ ...outfitWear, wornOn: localDate() }]);
  await user.click(screen.getByRole("button", { name: "Mark as worn" }));
  expect(mocks.record).toHaveBeenCalledWith("outfit", true, localDate());
  await screen.findByText("Wear recorded for this outfit and all its pieces.");
  expect(screen.getByText(/Worn on 1 day/)).toBeInTheDocument();
});
it("disables recording unsaved outfit changes", async () => {
  render(<WearHistory targetId="outfit" isOutfit disabled />);
  await screen.findByText("No wears recorded yet.");
  expect(screen.getByRole("button", { name: "Mark as worn" })).toBeDisabled();
});
it("shows propagated history and confirms removal from every piece", async () => {
  mocks.list.mockResolvedValue([outfitWear]);
  const user = userEvent.setup();
  render(<WearHistory targetId="piece" />);
  await screen.findByText(/Worn on 1 day/);
  await user.click(screen.getByText(/View wear history/));
  await user.click(screen.getByRole("button", { name: "Remove wear" }));
  expect(screen.getByText(/every piece recorded with it/)).toBeInTheDocument();
  const dialog = screen.getByRole("alertdialog");
  const { within } = await import("@testing-library/react");
  await user.click(within(dialog).getByRole("button", { name: "Remove wear" }));
  await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith("wear"));
  await screen.findByText("No wears recorded yet.");
});
it("keeps history visible after a failed save", async () => {
  mocks.list.mockResolvedValue([outfitWear]);
  mocks.record.mockRejectedValue("Already recorded.");
  const user = userEvent.setup();
  render(<WearHistory targetId="piece" />);
  await screen.findByText(/Worn on 1 day/);
  await user.click(screen.getByRole("button", { name: "Mark as worn" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Already recorded.",
  );
  expect(screen.getByText(/Worn on 1 day/)).toBeInTheDocument();
});

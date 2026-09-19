import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClothingItem } from "./types/clothing";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  chooseImage: vi.fn(),
  loadImage: vi.fn(),
  discardImage: vi.fn(),
}));

vi.mock("./lib/database/clothingRepository", () => ({
  clothingRepository: {
    create: mocks.create,
    get: mocks.get,
    list: mocks.list,
    update: mocks.update,
    delete: mocks.delete,
  },
}));
vi.mock("./lib/images/managedImages", () => ({
  chooseAndImportImage: mocks.chooseImage,
  loadManagedImage: mocks.loadImage,
  discardManagedImage: mocks.discardImage,
}));

import App from "./App";

const sampleItem: ClothingItem = {
  id: "item-1",
  name: "Blue jeans",
  category: "bottom",
  subtype: "Jeans",
  colors: ["blue"],
  material: "Denim",
  seasons: ["autumn"],
  occasions: ["casual"],
  styleTags: ["classic"],
  ownership: "owned",
  imagePath: "images/original/item.jpg",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([]);
  mocks.create.mockResolvedValue(sampleItem);
  mocks.update.mockResolvedValue(sampleItem);
  mocks.delete.mockResolvedValue(true);
  mocks.chooseImage.mockResolvedValue({
    reference: "images/original/new.jpg",
    dataUrl: "data:image/jpeg;base64,/9j/",
  });
  mocks.loadImage.mockResolvedValue({
    reference: sampleItem.imagePath,
    dataUrl: "data:image/jpeg;base64,/9j/",
  });
  mocks.discardImage.mockResolvedValue(true);
});

describe("App", () => {
  it("navigates between the primary sections", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Closet" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    expect(
      screen.getByRole("heading", { name: "Outfits" }),
    ).toBeInTheDocument();
  });

  it("creates a clothing item with selected metadata", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /\+ add item/i }));
    expect(
      screen.getByRole("dialog", { name: "Add item" }),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: /name/i }),
      "Black tee",
    );
    await user.click(screen.getByRole("button", { name: "Choose photo" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /category/i }),
      "top",
    );
    await user.click(screen.getByRole("checkbox", { name: "Black" }));
    await user.click(screen.getByRole("checkbox", { name: "Summer" }));
    await user.click(screen.getByRole("checkbox", { name: "Casual" }));
    await user.click(screen.getByRole("radio", { name: "Wishlist" }));
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      name: "Black tee",
      colors: ["black"],
      seasons: ["summer"],
      occasions: ["casual"],
      ownership: "wishlist",
      imagePath: "images/original/new.jpg",
    });
  });

  it("opens a saved item for editing", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit item" }));
    const name = screen.getByRole("textbox", { name: /name/i });
    await user.clear(name);
    await user.type(name, "Dark jeans");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][1]).toMatchObject({
      id: "item-1",
      name: "Dark jeans",
    });
  });

  it("keeps form input when validation fails", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /\+ add item/i }));
    const name = screen.getByRole("textbox", { name: /name/i });
    await user.type(name, "Minimal item");
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a photo");
    expect(name).toHaveValue("Minimal item");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("cancels edits without updating the record", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit item" }));
    const name = screen.getByRole("textbox", { name: /name/i });
    await user.clear(name);
    await user.type(name, "Unsaved name");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("deletes an item after confirmation", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    await user.click(screen.getByRole("button", { name: "Edit item" }));
    await user.click(screen.getByRole("button", { name: "Delete item" }));
    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith("item-1"));
  });

  it("combines closet filters and clears them", async () => {
    const wishlistDress: ClothingItem = {
      ...sampleItem,
      id: "item-2",
      name: "Black summer dress",
      category: "dress",
      subtype: "Midi dress",
      colors: ["black"],
      seasons: ["summer"],
      occasions: ["party"],
      ownership: "wishlist",
      imagePath: "images/original/dress.jpg",
    };
    mocks.list.mockResolvedValue([sampleItem, wishlistDress]);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Open Black summer dress" });
    await user.type(
      screen.getByRole("searchbox", { name: "Search by item name" }),
      "black",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      "dress",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Ownership" }),
      "wishlist",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Color" }),
      "black",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Season" }),
      "summer",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Occasion" }),
      "party",
    );
    expect(
      screen.getByRole("button", { name: "Open Black summer dress" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open Blue jeans" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("♥ Wishlist")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      screen.getByRole("button", { name: "Open Blue jeans" }),
    ).toBeInTheDocument();
  });
});

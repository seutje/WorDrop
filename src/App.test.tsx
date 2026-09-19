import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClothingItem } from "./types/clothing";
import type { Outfit } from "./types/outfit";

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
const outfitMocks = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  containingItem: vi.fn(),
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
vi.mock("./lib/database/outfitRepository", () => ({
  outfitRepository: outfitMocks,
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
const savedOutfit: Outfit = {
  id: "outfit-1",
  name: "Weekend look",
  itemIds: ["item-1"],
  notes: "Relaxed",
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
  mocks.get.mockResolvedValue(sampleItem);
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
  outfitMocks.list.mockResolvedValue([]);
  outfitMocks.create.mockResolvedValue(savedOutfit);
  outfitMocks.update.mockResolvedValue(savedOutfit);
  outfitMocks.delete.mockResolvedValue(true);
  outfitMocks.get.mockResolvedValue(savedOutfit);
  outfitMocks.containingItem.mockResolvedValue([]);
});

describe("App", () => {
  it("navigates between the primary sections", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Closet" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    expect(
      screen.getByRole("heading", { name: "Outfit Builder" }),
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
    await user.click(await screen.findByRole("button", { name: "Edit" }));
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
    await user.click(await screen.findByRole("button", { name: "Edit" }));
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
    await user.click(await screen.findByRole("button", { name: "Edit" }));
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

  it("shows a fully tagged item detail and its future sections", async () => {
    const fullItem: ClothingItem = {
      ...sampleItem,
      pattern: "Solid",
      seasons: ["spring", "summer", "autumn"],
      occasions: ["casual", "travel"],
      styleTags: ["classic", "minimalist"],
      notes: "A dependable everyday pair.",
    };
    mocks.list.mockResolvedValue([fullItem]);
    mocks.get.mockResolvedValue(fullItem);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Blue jeans" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Denim")).toBeInTheDocument();
    expect(screen.getByText("Solid")).toBeInTheDocument();
    expect(screen.getByText("A dependable everyday pair.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Looks good with" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Saved outfits" }),
    ).toBeInTheDocument();
  });

  it("handles a missing item without broken navigation", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    mocks.get.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Item not found" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to Closet" }));
    expect(screen.getByRole("heading", { name: "Closet" })).toBeInTheDocument();
  });

  it("deletes directly from item details and returns to the closet", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith("item-1"));
    expect(screen.getByRole("heading", { name: "Closet" })).toBeInTheDocument();
  });

  it("shows owned recommendations by default and can include wishlist matches", async () => {
    const ownedMatch: ClothingItem = {
      ...sampleItem,
      id: "owned-match",
      name: "White cotton tee",
      category: "top",
      colors: ["white"],
      material: "Cotton",
      imagePath: "images/original/tee.jpg",
    };
    const wishlistMatch: ClothingItem = {
      ...sampleItem,
      id: "wishlist-match",
      name: "Navy sneakers",
      category: "shoes",
      colors: ["navy"],
      ownership: "wishlist",
      imagePath: "images/original/shoes.jpg",
    };
    const wardrobe = [sampleItem, wishlistMatch, ownedMatch];
    mocks.list.mockResolvedValue(wardrobe);
    mocks.get.mockImplementation(
      async (id: string) => wardrobe.find((item) => item.id === id) ?? null,
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    expect(
      await screen.findByRole("button", {
        name: "Inspect recommendation White cotton tee",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Inspect recommendation Navy sneakers",
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("checkbox", { name: "Include wishlist" }),
    );
    expect(
      screen.getByRole("button", {
        name: "Inspect recommendation Navy sneakers",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Inspect recommendation Blue jeans",
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Inspect recommendation White cotton tee",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "White cotton tee" }),
    ).toBeInTheDocument();
  });

  it("creates an outfit from scratch", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    await user.click(
      await screen.findByRole("button", { name: /Add clothing/ }),
    );
    await user.click(screen.getByRole("button", { name: /Blue jeans/ }));
    await user.type(
      screen.getByRole("textbox", { name: "Outfit name" }),
      "Weekend look",
    );
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "Relaxed");
    await user.click(screen.getByRole("button", { name: "Save outfit" }));
    await waitFor(() => expect(outfitMocks.create).toHaveBeenCalledOnce());
    expect(outfitMocks.create.mock.calls[0][0]).toEqual({
      name: "Weekend look",
      notes: "Relaxed",
      itemIds: ["item-1"],
    });
  });

  it("starts an outfit from clothing details", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Build outfit from this item",
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "Outfit Builder" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Started an outfit from your selection."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("img", { name: "Blue jeans" }),
    ).toBeInTheDocument();
  });

  it("reopens, replaces, removes, and updates a saved outfit", async () => {
    const tee: ClothingItem = {
      ...sampleItem,
      id: "item-2",
      name: "White tee",
      category: "top",
      imagePath: "images/original/tee.jpg",
    };
    mocks.list.mockResolvedValue([sampleItem, tee]);
    outfitMocks.list.mockResolvedValue([savedOutfit]);
    outfitMocks.update.mockResolvedValue({
      ...savedOutfit,
      itemIds: ["item-2"],
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    await user.click(
      await screen.findByRole("button", { name: /Weekend look/ }),
    );
    await user.click(screen.getByRole("button", { name: "Replace" }));
    await user.click(screen.getByRole("button", { name: /White tee/ }));
    expect(screen.getByText("White tee")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("White tee")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add clothing/ }));
    await user.click(screen.getByRole("button", { name: /White tee/ }));
    await user.click(screen.getByRole("button", { name: "Save outfit" }));
    await waitFor(() => expect(outfitMocks.update).toHaveBeenCalledOnce());
  });
});

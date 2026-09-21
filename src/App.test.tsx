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
  setFavorite: vi.fn(),
  delete: vi.fn(),
  chooseImage: vi.fn(),
  loadImage: vi.fn(),
  discardImage: vi.fn(),
  saveDisplayImage: vi.fn(),
}));
const outfitMocks = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  setFavorite: vi.fn(),
  delete: vi.fn(),
  containingItem: vi.fn(),
}));
const backupMocks = vi.hoisted(() => ({
  chooseAndExport: vi.fn(),
  chooseRestore: vi.fn(),
  restore: vi.fn(),
}));
const settingsMocks = vi.hoisted(() => ({
  get: vi.fn(),
  setAllowMultipleBottoms: vi.fn(),
}));
const openerMocks = vi.hoisted(() => ({ openUrl: vi.fn() }));
const classificationMocks = vi.hoisted(() => ({ classify: vi.fn() }));

vi.mock("./lib/database/clothingRepository", () => ({
  clothingRepository: {
    create: mocks.create,
    get: mocks.get,
    list: mocks.list,
    update: mocks.update,
    setFavorite: mocks.setFavorite,
    delete: mocks.delete,
  },
}));
vi.mock("./lib/images/managedImages", () => ({
  chooseAndImportImage: mocks.chooseImage,
  loadManagedImage: mocks.loadImage,
  discardManagedImage: mocks.discardImage,
  saveDisplayImage: mocks.saveDisplayImage,
}));
vi.mock("./lib/images/imageFraming", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./lib/images/imageFraming")>();
  return {
    ...original,
    renderDisplayImage: vi
      .fn()
      .mockResolvedValue("data:image/jpeg;base64,/9j/"),
  };
});
vi.mock("./lib/images/imageClassification", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./lib/images/imageClassification")>();
  return { ...original, classifyManagedImage: classificationMocks.classify };
});
vi.mock("./lib/database/outfitRepository", () => ({
  outfitRepository: outfitMocks,
}));
vi.mock("./lib/backup", () => ({
  chooseAndExportBackup: backupMocks.chooseAndExport,
  chooseBackupToRestore: backupMocks.chooseRestore,
  restoreBackup: backupMocks.restore,
}));
vi.mock("./lib/settings", () => ({
  getAppSettings: settingsMocks.get,
  setAllowMultipleBottoms: settingsMocks.setAllowMultipleBottoms,
}));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: openerMocks.openUrl }));

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
  favorite: false,
  imagePath: "images/original/item.jpg",
  displayImagePath: "images/display/item.jpg",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
const savedOutfit: Outfit = {
  id: "outfit-1",
  name: "Weekend look",
  itemIds: ["item-1"],
  notes: "Relaxed",
  favorite: false,
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
  mocks.setFavorite.mockImplementation((_id: string, favorite: boolean) =>
    Promise.resolve({ ...sampleItem, favorite }),
  );
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
  mocks.saveDisplayImage.mockResolvedValue({
    reference: "images/display/framed.jpg",
    dataUrl: "data:image/jpeg;base64,/9j/",
  });
  classificationMocks.classify.mockRejectedValue("Classifier unavailable");
  outfitMocks.list.mockResolvedValue([]);
  outfitMocks.create.mockResolvedValue(savedOutfit);
  outfitMocks.update.mockResolvedValue(savedOutfit);
  outfitMocks.setFavorite.mockImplementation((_id: string, favorite: boolean) =>
    Promise.resolve({ ...savedOutfit, favorite }),
  );
  outfitMocks.delete.mockResolvedValue(true);
  outfitMocks.get.mockResolvedValue(savedOutfit);
  outfitMocks.containingItem.mockResolvedValue([]);
  const backupSummary = {
    path: "C:/Backups/wordrop-backup.wordrop",
    clothingItems: 3,
    outfits: 2,
    images: 3,
  };
  backupMocks.chooseAndExport.mockResolvedValue(backupSummary);
  backupMocks.chooseRestore.mockResolvedValue(
    "C:/Backups/wordrop-backup.wordrop",
  );
  backupMocks.restore.mockResolvedValue(backupSummary);
  settingsMocks.get.mockResolvedValue({ allowMultipleBottoms: false });
  settingsMocks.setAllowMultipleBottoms.mockResolvedValue({
    allowMultipleBottoms: true,
  });
  openerMocks.openUrl.mockResolvedValue(undefined);
});

async function openBackup(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.click(screen.getByRole("tab", { name: "Backup & Restore" }));
}

describe("App", () => {
  it("toggles a closet item's favorite heart without opening the item", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    const user = userEvent.setup();
    render(<App />);

    const favoriteButton = await screen.findByRole("button", {
      name: "Add Blue jeans to favorites",
    });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "false");
    await user.click(favoriteButton);

    expect(mocks.setFavorite).toHaveBeenCalledWith("item-1", true);
    expect(
      await screen.findByRole("button", {
        name: "Remove Blue jeans from favorites",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("heading", { name: "Blue jeans" }),
    ).not.toBeInTheDocument();
  });

  it("navigates between the primary sections", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Closet" })).toBeInTheDocument();
    expect(screen.getByText("Version 0.5.1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    expect(
      screen.getByRole("heading", { name: "Saved Outfits" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("tab", { name: "Preferences" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(screen.getByRole("tab", { name: "Backup & Restore" }));
    expect(
      screen.getByRole("heading", { name: "Backup & Restore" }),
    ).toBeInTheDocument();
  });

  it("exports a complete local backup", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openBackup(user);
    await user.click(
      screen.getByRole("button", { name: "Choose backup location" }),
    );
    expect(
      await screen.findByText(
        "Backup saved with 3 clothing items, 3 images, and 2 outfits.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the specific reason when backup export fails", async () => {
    backupMocks.chooseAndExport.mockRejectedValue(
      "The finished backup could not be copied to the selected folder.",
    );
    const user = userEvent.setup();
    render(<App />);
    await openBackup(user);
    await user.click(
      screen.getByRole("button", { name: "Choose backup location" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The finished backup could not be copied to the selected folder.",
    );
  });

  it("requires confirmation before restoring a backup", async () => {
    vi.spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);
    await openBackup(user);
    const restoreButton = screen.getByRole("button", {
      name: "Choose backup to restore",
    });
    await user.click(restoreButton);
    expect(backupMocks.restore).not.toHaveBeenCalled();
    await user.click(restoreButton);
    await waitFor(() =>
      expect(backupMocks.restore).toHaveBeenCalledWith(
        "C:/Backups/wordrop-backup.wordrop",
      ),
    );
    expect(
      screen.getByText(
        "Backup restored with 3 clothing items, 3 images, and 2 outfits.",
      ),
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

  it("keeps the selected category when classification has no suggestion", async () => {
    classificationMocks.classify.mockResolvedValue({
      suggestedCategory: null,
      suggestedSubtype: null,
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /\+ add item/i }));
    await user.type(
      screen.getByRole("textbox", { name: /name/i }),
      "Blue shirt",
    );
    await user.click(screen.getByRole("button", { name: "Choose photo" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /category/i }),
      "top",
    );
    await user.click(screen.getByRole("button", { name: "Add item" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      category: "top",
      subtype: undefined,
    });
  });

  it("prefills a confident subtype but preserves free-form manual input", async () => {
    classificationMocks.classify.mockResolvedValue({
      predictions: [{ category: "top", score: 0.8 }],
      suggestedCategory: "top",
      confidenceScore: 0.8,
      topTwoMargin: 0.5,
      subtypePredictions: [{ subtype: "T-shirt", category: "top", score: 0.7 }],
      suggestedSubtype: "T-shirt",
      subtypeConfidenceScore: 0.7,
      subtypeTopTwoMargin: 0.4,
      timing: {
        sessionInitializationMs: 0,
        imageDecodePreprocessingMs: 1,
        modelInferenceMs: 2,
        categoryScoringMs: 0.01,
        subtypeScoringMs: 0.01,
        scoringMs: 0.02,
        totalMs: 3,
      },
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /\+ add item/i }));
    await user.click(screen.getByRole("button", { name: "Choose photo" }));
    const subtype = screen.getByRole("textbox", { name: /subtype/i });
    await waitFor(() => expect(subtype).toHaveValue("T-shirt"));
    await user.clear(subtype);
    await user.type(subtype, "Vintage oversized band tee");
    expect(subtype).toHaveValue("Vintage oversized band tee");
  });

  it("does not overwrite subtype text entered while classification is pending", async () => {
    let finish!: (value: unknown) => void;
    classificationMocks.classify.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /\+ add item/i }));
    await user.click(screen.getByRole("button", { name: "Choose photo" }));
    const subtype = screen.getByRole("textbox", { name: /subtype/i });
    await user.type(subtype, "Graphic tee");
    finish({
      predictions: [{ category: "top", score: 0.8 }],
      suggestedCategory: "top",
      confidenceScore: 0.8,
      topTwoMargin: 0.5,
      subtypePredictions: [],
      suggestedSubtype: "T-shirt",
      subtypeConfidenceScore: 0.7,
      subtypeTopTwoMargin: 0.4,
      timing: {},
    });
    await screen.findByText(/Suggested from photo/);
    expect(subtype).toHaveValue("Graphic tee");
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

  it("renders and searches a 1,000-item wardrobe", async () => {
    const largeWardrobe = Array.from({ length: 1_000 }, (_, index) => ({
      ...sampleItem,
      id: `large-${index}`,
      name: index === 999 ? "Target performance coat" : `Garment ${index}`,
      imagePath: `images/original/large-${index}.jpg`,
    }));
    mocks.list.mockResolvedValue(largeWardrobe);
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByText("1000 items")).toBeInTheDocument();
    await user.type(
      screen.getByRole("searchbox", { name: "Search by item name" }),
      "target performance",
    );
    expect(
      screen.getByRole("button", { name: "Open Target performance coat" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("shows a fully tagged item detail and its future sections", async () => {
    const fullItem: ClothingItem = {
      ...sampleItem,
      pattern: "Solid",
      seasons: ["spring", "summer", "autumn"],
      occasions: ["casual", "travel"],
      styleTags: ["classic", "minimalist"],
      notes: "A dependable everyday pair.",
      sourceUrl: "https://www.shop.example/products/blue-jeans?color=navy",
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
    const sourceLink = screen.getByRole("button", { name: /shop\.example/ });
    expect(sourceLink).toHaveAttribute("title", fullItem.sourceUrl);
    await user.click(sourceLink);
    expect(openerMocks.openUrl).toHaveBeenCalledWith(fullItem.sourceUrl);
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

  it("summarizes how a wishlist item fits owned clothing", async () => {
    const wishlistBottom: ClothingItem = {
      ...sampleItem,
      id: "wishlist-bottom",
      name: "Olive trousers",
      category: "bottom",
      colors: ["olive"],
      ownership: "wishlist",
      imagePath: "images/original/trousers.jpg",
    };
    const ownedTop: ClothingItem = {
      ...sampleItem,
      id: "owned-top",
      name: "Cream shirt",
      category: "top",
      colors: ["cream"],
      imagePath: "images/original/shirt.jpg",
    };
    const wishlistShoes: ClothingItem = {
      ...sampleItem,
      id: "wishlist-shoes",
      name: "Wishlist boots",
      category: "shoes",
      ownership: "wishlist",
      imagePath: "images/original/boots.jpg",
    };
    const wardrobe = [wishlistBottom, ownedTop, wishlistShoes];
    mocks.list.mockResolvedValue(wardrobe);
    mocks.get.mockImplementation(
      async (id: string) => wardrobe.find((entry) => entry.id === id) ?? null,
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Olive trousers" }),
    );
    expect(
      await screen.findByRole("heading", { name: "How it fits your closet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1", { selector: ".wishlist-match-count strong" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 of 1 owned items/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Top", level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Only clothing marked Owned is counted/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Inspect recommendation Wishlist boots",
      }),
    ).not.toBeInTheDocument();
  });

  it("creates an outfit from scratch", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    await user.click(
      await screen.findByRole("button", { name: "+ Create outfit" }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Add clothing/ }),
    );
    const pickerItem = screen.getByRole("button", { name: /Blue jeans/ });
    await waitFor(() =>
      expect(pickerItem.querySelector("img")).toHaveAttribute(
        "src",
        "data:image/jpeg;base64,/9j/",
      ),
    );
    expect(mocks.loadImage).toHaveBeenCalledWith("images/display/item.jpg");
    await user.click(pickerItem);
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
      favorite: false,
    });
  });

  it("toggles a saved outfit favorite without opening it", async () => {
    outfitMocks.list.mockResolvedValue([savedOutfit]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Outfits" }));

    const favoriteButton = await screen.findByRole("button", {
      name: "Add Weekend look to favorites",
    });
    await user.click(favoriteButton);

    expect(outfitMocks.setFavorite).toHaveBeenCalledWith("outfit-1", true);
    expect(
      await screen.findByRole("button", {
        name: "Remove Weekend look from favorites",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("heading", { name: "Outfit Builder" }),
    ).not.toBeInTheDocument();
  });

  it("updates advisory compatibility as outfit pieces change", async () => {
    const tee: ClothingItem = {
      ...sampleItem,
      id: "item-2",
      name: "White tee",
      category: "top",
      colors: ["white"],
      material: "Cotton",
      imagePath: "images/original/tee.jpg",
    };
    mocks.list.mockResolvedValue([sampleItem, tee]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    await user.click(
      await screen.findByRole("button", { name: "+ Create outfit" }),
    );
    expect(
      screen.getByText("Add another item to see outfit compatibility."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add clothing/ }));
    await user.click(screen.getByRole("button", { name: /Blue jeans/ }));
    await user.click(screen.getByRole("button", { name: /Add clothing/ }));
    await user.click(screen.getByRole("button", { name: /White tee/ }));
    expect(
      screen.getByLabelText(/Compatibility score \d+ out of 100/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "A style suggestion, not a rule. You can always save this outfit.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(
      screen.getByText("Add another item to see outfit compatibility."),
    ).toBeInTheDocument();
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
      await screen.findByRole("button", { name: "Open Weekend look" }),
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

  it("shows outfit previews and can rename a saved outfit", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    outfitMocks.list.mockResolvedValue([savedOutfit]);
    outfitMocks.update.mockResolvedValue({
      ...savedOutfit,
      name: "Sunday walk",
    });
    vi.spyOn(window, "prompt").mockReturnValue("Sunday walk");
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    expect(
      await screen.findByRole("button", { name: "Open Weekend look" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await waitFor(() =>
      expect(outfitMocks.update).toHaveBeenCalledWith(
        "outfit-1",
        expect.objectContaining({ name: "Sunday walk" }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Open Sunday walk" }),
    ).toBeInTheDocument();
  });

  it("deletes an outfit without deleting clothing", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    outfitMocks.list.mockResolvedValue([savedOutfit]);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Outfits" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(outfitMocks.delete).toHaveBeenCalledWith("outfit-1"),
    );
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Save your first look")).toBeInTheDocument();
  });

  it("opens an outfit containing the selected clothing item", async () => {
    mocks.list.mockResolvedValue([sampleItem]);
    outfitMocks.containingItem.mockResolvedValue([savedOutfit]);
    outfitMocks.list.mockResolvedValue([savedOutfit]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Open Blue jeans" }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Weekend look/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "Outfit Builder" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Outfit name" })).toHaveValue(
      "Weekend look",
    );
  });
});

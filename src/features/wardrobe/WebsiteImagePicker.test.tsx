import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebsiteImagePicker } from "./WebsiteImagePicker";
import { ClothingItemForm } from "./ClothingItemForm";
import {
  findWebsiteImages,
  cancelWebsiteImageBrowser,
  importWebsiteImage,
  previewWebsiteImage,
  type WebsiteImages,
} from "../../lib/images/websiteImages";
import {
  chooseAndImportImage,
  discardManagedImage,
  type ManagedImage,
} from "../../lib/images/managedImages";

vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: vi.fn().mockResolvedValue(() => undefined),
  }),
}));

vi.mock("../../lib/images/websiteImages", () => ({
  cancelWebsiteImageBrowser: vi.fn().mockResolvedValue(undefined),
  findWebsiteImages: vi.fn(),
  importWebsiteImage: vi.fn(),
  previewWebsiteImage: vi.fn(),
}));
vi.mock("../../lib/images/managedImages", () => ({
  chooseAndImportImage: vi.fn(),
  discardManagedImage: vi.fn(),
  loadManagedImage: vi.fn(),
  saveDisplayImage: vi.fn(),
}));

const photo = {
  reference: "images/original/download.png",
  dataUrl: "data:image/png;base64,photo",
};
const results: WebsiteImages = {
  pageUrl: "https://shop.example/dress",
  title: "Blue dress from shop",
  images: [
    { url: "https://cdn.example/dress.png", label: "Dress", suggested: true },
    { url: "https://cdn.example/logo.png", label: "Logo", suggested: false },
  ],
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(cancelWebsiteImageBrowser).mockResolvedValue(undefined);
  vi.mocked(findWebsiteImages).mockResolvedValue(results);
  vi.mocked(previewWebsiteImage).mockResolvedValue(photo.dataUrl);
  vi.mocked(importWebsiteImage).mockResolvedValue(photo);
  vi.mocked(discardManagedImage).mockResolvedValue(true);
  vi.mocked(chooseAndImportImage).mockResolvedValue({
    ...photo,
    reference: "images/original/local.png",
  });
});
afterEach(cleanup);

async function search(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText("Website URL"),
    "https://shop.example/dress",
  );
  await user.click(screen.getByRole("button", { name: "Find images" }));
}

describe("website image import", () => {
  it("preserves form values and returns the selected image to crop/zoom without saving", async () => {
    const user = userEvent.setup();
    const saved = vi.fn();
    render(<ClothingItemForm onCancel={vi.fn()} onSaved={saved} />);
    await user.type(screen.getByLabelText(/Name/), "My blue dress");
    await user.type(screen.getByLabelText("Notes"), "Keep these notes");
    await user.click(screen.getByRole("button", { name: "Choose photo" }));
    await user.click(screen.getByRole("button", { name: "Get from URL" }));
    await search(user);
    const choice = await screen.findByRole("button", {
      name: "Use image 1: Dress",
    });
    await waitFor(() => expect(choice).toBeEnabled());
    await user.click(choice);
    expect(await screen.findByLabelText(/Name/)).toHaveValue("My blue dress");
    expect(screen.getByLabelText(/^Item URL/)).toHaveValue(results.pageUrl);
    expect(screen.getByLabelText("Notes")).toHaveValue("Keep these notes");
    expect(screen.getByAltText("Clothing crop preview")).toHaveAttribute(
      "src",
      photo.dataUrl,
    );
    expect(discardManagedImage).toHaveBeenCalledWith(
      "images/original/local.png",
    );
    expect(saved).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(discardManagedImage).toHaveBeenCalledWith(photo.reference);
  });

  it("fills a blank name from the page title", async () => {
    const user = userEvent.setup();
    render(<ClothingItemForm onCancel={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Get from URL" }));
    await search(user);
    const choice = await screen.findByRole("button", {
      name: "Use image 1: Dress",
    });
    await waitFor(() => expect(choice).toBeEnabled());
    await user.click(choice);
    expect(await screen.findByLabelText(/Name/)).toHaveValue(
      "Blue dress from shop",
    );
  });

  it("reveals filtered images and keeps the picker available after a failed download", async () => {
    const user = userEvent.setup();
    vi.mocked(importWebsiteImage).mockRejectedValue(
      "The website blocked this download. Try another photo.",
    );
    const selected = vi.fn();
    render(<WebsiteImagePicker onBack={vi.fn()} onSelected={selected} />);
    await search(user);
    expect(
      screen.queryByRole("button", { name: /Use image 2/ }),
    ).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole("button", { name: "Show more images" }),
    );
    const choice = await screen.findByRole("button", {
      name: "Use image 2: Logo",
    });
    await waitFor(() => expect(choice).toBeEnabled());
    await user.click(choice);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "blocked this download",
    );
    expect(selected).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Back to item" })).toBeEnabled();
  });

  it("discards a download that finishes after returning to the form", async () => {
    const user = userEvent.setup();
    const download = deferred<ManagedImage>();
    vi.mocked(importWebsiteImage).mockReturnValue(download.promise);
    const selected = vi.fn();
    const back = vi.fn();
    render(<WebsiteImagePicker onBack={back} onSelected={selected} />);
    await search(user);
    const choice = await screen.findByRole("button", {
      name: "Use image 1: Dress",
    });
    await waitFor(() => expect(choice).toBeEnabled());
    await user.click(choice);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => download.resolve(photo));
    expect(back).toHaveBeenCalledOnce();
    expect(discardManagedImage).toHaveBeenCalledWith(photo.reference);
    expect(selected).not.toHaveBeenCalled();
  });

  it("ignores search results after cancellation and preserves the previous photo", async () => {
    const user = userEvent.setup();
    const request = deferred<WebsiteImages>();
    vi.mocked(findWebsiteImages).mockReturnValue(request.promise);
    render(<ClothingItemForm onCancel={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Choose photo" }));
    await user.click(screen.getByRole("button", { name: "Get from URL" }));
    await search(user);
    await user.keyboard("{Escape}");
    await act(async () => request.resolve(results));
    expect(
      screen.getByRole("dialog", { name: "Add item" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Clothing crop preview")).toHaveAttribute(
      "src",
      photo.dataUrl,
    );
    expect(previewWebsiteImage).not.toHaveBeenCalled();
    expect(discardManagedImage).not.toHaveBeenCalled();
  });

  it("shows useful errors and an empty state", async () => {
    const user = userEvent.setup();
    vi.mocked(findWebsiteImages)
      .mockRejectedValueOnce("Check your internet connection.")
      .mockResolvedValueOnce({ ...results, images: [] });
    render(<WebsiteImagePicker onBack={vi.fn()} onSelected={vi.fn()} />);
    await user.type(screen.getByLabelText("Website URL"), "file:///photo.png");
    await user.click(screen.getByRole("button", { name: "Find images" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "complete website link",
    );
    expect(findWebsiteImages).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Website URL"));
    await search(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "internet connection",
    );
    await user.click(screen.getByRole("button", { name: "Find images" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "No supported photos were found",
    );
  });

  it("bounds preview concurrency and continues when a preview fails", async () => {
    const user = userEvent.setup();
    const first = deferred<string>();
    vi.mocked(findWebsiteImages).mockResolvedValue({
      ...results,
      images: Array.from({ length: 5 }, (_, i) => ({
        url: `https://cdn.example/${i}.png`,
        label: `Photo ${i}`,
        suggested: true,
      })),
    });
    vi.mocked(previewWebsiteImage)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(first.promise)
      .mockRejectedValueOnce("Unavailable")
      .mockResolvedValue(photo.dataUrl);
    render(<WebsiteImagePicker onBack={vi.fn()} onSelected={vi.fn()} />);
    await search(user);
    await waitFor(() => expect(previewWebsiteImage).toHaveBeenCalledTimes(3));
    await act(async () => first.resolve(photo.dataUrl));
    await waitFor(() => expect(previewWebsiteImage).toHaveBeenCalledTimes(5));
    expect(await screen.findByText("Preview unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Use image 5: Photo 4" }),
    ).toBeEnabled();
  });
});

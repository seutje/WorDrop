import { afterEach, expect, it, vi } from "vitest";
import source from "../../../src-tauri/src/website_browser_extract.js?raw";

afterEach(() => vi.useRealTimers());

it("waits for website verification and returns only bounded image markup", () => {
  vi.useFakeTimers();
  const page = document.implementation.createHTMLDocument("Just a moment...");
  page.head.innerHTML +=
    '<meta property="og:image" content="https://cdn.example/product.jpg">';
  page.body.innerHTML =
    '<input value="private text"><p>Unrelated page text</p><img alt="Product" src="https://cdn.example/product.jpg" onerror="alert(1)"><script>unrelatedCode()</script>';
  const browserWindow = {
    setInterval,
    clearInterval,
    location: { href: "https://shop.example/product?color=blue" },
  };
  new Function("window", "document", source)(browserWindow, page);
  vi.advanceTimersByTime(4000);
  expect(browserWindow.location.href).toBe(
    "https://shop.example/product?color=blue",
  );
  page.title = "Product";
  vi.advanceTimersByTime(1000);
  const callback = new URL(browserWindow.location.href);
  expect(callback.hostname).toBe("wordrop-import.invalid");
  const snapshot = JSON.parse(callback.searchParams.get("payload") ?? "{}");
  expect(snapshot.url).toBe("https://shop.example/product?color=blue");
  expect(snapshot.html).toContain("https://cdn.example/product.jpg");
  expect(snapshot.html).not.toContain("private text");
  expect(snapshot.html).not.toContain("Unrelated page text");
  expect(snapshot.html).not.toContain("onerror");
  expect(snapshot.html).not.toContain("unrelatedCode");
  expect(vi.getTimerCount()).toBe(0);
});

it("stops polling a blocked page without sending a result", () => {
  vi.useFakeTimers();
  const page = document.implementation.createHTMLDocument("Just a moment...");
  const browserWindow = {
    setInterval,
    clearInterval,
    location: { href: "https://shop.example/product" },
  };
  new Function("window", "document", source)(browserWindow, page);
  vi.advanceTimersByTime(112000);
  expect(browserWindow.location.href).toBe("https://shop.example/product");
  expect(vi.getTimerCount()).toBe(0);
});

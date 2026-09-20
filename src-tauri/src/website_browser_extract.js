/* global window, document */
(() => {
  if (window.__wordropPhotoCollector) return;
  window.__wordropPhotoCollector = true;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (attempts < 3) return;
    if (attempts > 110) {
      window.clearInterval(timer);
      return;
    }
    // Let the real website finish its verification and render the product.
    if (
      /just a moment|access denied|verify you|security check/i.test(
        document.title,
      )
    )
      return;
    const photos = [...document.querySelectorAll("img")].filter(
      (image) =>
        image.naturalWidth >= 200 ||
        (image.getAttribute("srcset") && image.getAttribute("alt")),
    );
    const meta = document.querySelector("meta[property='og:image']");
    if (!photos.length && !meta) return;
    const snapshot = document.implementation.createHTMLDocument("");
    const base = snapshot.createElement("base");
    base.href = document.baseURI;
    snapshot.head.append(base);
    for (const node of [
      ...document.querySelectorAll(
        "meta[property],meta[name],script[type='application/ld+json']",
      ),
    ].slice(0, 40)) {
      if (node.outerHTML.length < 100000)
        snapshot.head.append(node.cloneNode(true));
    }
    for (const image of [
      ...document.querySelectorAll("img,picture source"),
    ].slice(0, 200)) {
      const copy = snapshot.createElement("img");
      for (const attribute of [
        "src",
        "srcset",
        "data-src",
        "data-srcset",
        "data-lazy-src",
        "data-original",
        "alt",
        "width",
        "height",
        "class",
      ]) {
        const value = image.getAttribute(attribute);
        if (value && value.length < 12000) copy.setAttribute(attribute, value);
      }
      if (!copy.getAttribute("src") && image.currentSrc)
        copy.setAttribute("src", image.currentSrc);
      snapshot.body.append(copy);
      if (snapshot.documentElement.outerHTML.length > 250000) break;
    }
    const payload = JSON.stringify({
      url: window.location.href,
      html: snapshot.documentElement.outerHTML,
    });
    if (payload.length > 500000) return;
    window.clearInterval(timer);
    // Native navigation handling intercepts and cancels this URL. No native IPC
    // permissions are granted to the shop, and no snapshot is sent over HTTP.
    window.location.href =
      "https://wordrop-import.invalid/result?payload=" +
      encodeURIComponent(payload);
  }, 1000);
})();

use base64::{engine::general_purpose::STANDARD, Engine};
use image::{ImageReader, Limits};
use reqwest::{redirect::Policy, Url};
use scraper::{Html, Selector};
use serde::Serialize;
use serde_json::Value;
use std::{collections::HashSet, io::Cursor, net::IpAddr, time::Duration};

const MAX_PAGE_BYTES: usize = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES: usize = 25 * 1024 * 1024;
const MAX_CANDIDATES: usize = 100;
const BLOCKED_PAGE: &str =
    "This website needs to be opened in a browser before its photos can be read.";

pub fn needs_browser(error: &str) -> bool {
    error == BLOCKED_PAGE
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageCandidate {
    pub url: String,
    pub label: String,
    pub suggested: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebsiteImages {
    pub page_url: String,
    pub title: Option<String>,
    pub images: Vec<ImageCandidate>,
}

fn public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ip) => {
            let [a, b, _, _] = ip.octets();
            !ip.is_private()
                && !ip.is_loopback()
                && !ip.is_link_local()
                && !ip.is_broadcast()
                && !ip.is_documentation()
                && !ip.is_unspecified()
                && a != 0
                && a < 224
                && !(a == 100 && (64..=127).contains(&b))
                && !(a == 198 && (b == 18 || b == 19))
        }
        IpAddr::V6(ip) => {
            let segments = ip.segments();
            // Global unicast only; exclude documentation and transition ranges.
            (segments[0] & 0xe000) == 0x2000
                && segments[0] != 0x2002
                && !(segments[0] == 0x2001 && (segments[1] < 0x0200 || segments[1] == 0x0db8))
        }
    }
}

pub(crate) fn web_url(value: &str) -> Result<Url, String> {
    let url = Url::parse(value.trim())
        .map_err(|_| "Enter a complete website link beginning with https://.".to_string())?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || !matches!(url.port_or_known_default(), Some(80 | 443))
    {
        return Err(
            "Use a public http:// or https:// website link without login details or a custom port."
                .into(),
        );
    }
    if let Ok(ip) = url
        .host_str()
        .unwrap_or("")
        .trim_matches(['[', ']'])
        .parse::<IpAddr>()
    {
        if !public_ip(ip) {
            return Err("Use a public website link.".into());
        }
    }
    Ok(url)
}

async fn fetch_inner(value: &str, limit: usize) -> Result<(Url, Vec<u8>), String> {
    let mut url = web_url(value)?;
    for _ in 0..6 {
        let host = url
            .host_str()
            .ok_or("Use a public website link.")?
            .trim_matches(['[', ']']);
        let addresses: Vec<_> =
            tokio::net::lookup_host((host, url.port_or_known_default().unwrap_or(443)))
                .await
                .map_err(|_| {
                    "The website could not be reached. Check the link and your internet connection."
                        .to_string()
                })?
                .collect();
        if addresses.is_empty() || addresses.iter().any(|address| !public_ip(address.ip())) {
            return Err(
                "Use a public website link. Local network addresses are not supported.".into(),
            );
        }
        // Pin checked DNS answers, including on redirects, so page images cannot access local services.
        let client = reqwest::Client::builder()
            .redirect(Policy::none())
            .referer(false)
            .resolve_to_addrs(host, &addresses)
            .user_agent(if limit == MAX_PAGE_BYTES {
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
            } else {
                "WorDrop/0.3 (user-requested image import)"
            })
            .connect_timeout(Duration::from_secs(8))
            .timeout(Duration::from_secs(20))
            .build()
            .map_err(|_| "The website connection could not be started.".to_string())?;
        let accept = if limit == MAX_PAGE_BYTES {
            "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
        } else {
            "image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.1"
        };
        let mut response = client.get(url.clone())
            .header(reqwest::header::ACCEPT, accept)
            .header(reqwest::header::ACCEPT_LANGUAGE, "en-CA,en;q=0.9")
            .send().await
            .map_err(|_| "The website could not be loaded. Check your connection or try choosing a photo from your computer.".to_string())?;
        if response.status().is_redirection() {
            let location = response
                .headers()
                .get(reqwest::header::LOCATION)
                .and_then(|header| header.to_str().ok())
                .ok_or("The website returned an invalid redirect.")?;
            url = web_url(
                url.join(location)
                    .map_err(|_| "The website returned an invalid redirect.")?
                    .as_str(),
            )?;
            continue;
        }
        if !response.status().is_success() {
            if limit == MAX_PAGE_BYTES && matches!(response.status().as_u16(), 403 | 429) {
                return Err(BLOCKED_PAGE.into());
            }
            return Err("The website did not allow this download. Try another link or choose a photo from your computer. Your item has not changed.".into());
        }
        if response
            .content_length()
            .is_some_and(|length| length > limit as u64)
        {
            return Err("This download is too large. Try another image or page.".into());
        }
        let mut bytes = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| "The download was interrupted. Try again.".to_string())?
        {
            if bytes.len().saturating_add(chunk.len()) > limit {
                return Err("This download is too large. Try another image or page.".into());
            }
            bytes.extend_from_slice(&chunk);
        }
        return Ok((url, bytes));
    }
    Err("The website redirected too many times. Try a direct product link.".into())
}

async fn fetch(value: &str, limit: usize) -> Result<(Url, Vec<u8>), String> {
    tokio::time::timeout(Duration::from_secs(30), fetch_inner(value, limit))
        .await
        .map_err(|_| {
            "The website took too long to respond. Try again or choose a photo from your computer."
                .to_string()
        })?
}

fn selector(value: &str) -> Selector {
    Selector::parse(value).expect("static website image selector")
}

struct Candidates {
    base: Url,
    seen: HashSet<String>,
    images: Vec<ImageCandidate>,
}

impl Candidates {
    fn add(&mut self, value: &str, label: &str, suggested: bool) {
        if self.images.len() >= MAX_CANDIDATES || value.trim().is_empty() {
            return;
        }
        let Ok(mut url) = self.base.join(value.trim()) else {
            return;
        };
        url.set_fragment(None);
        if web_url(url.as_str()).is_err() || !self.seen.insert(url.to_string()) {
            return;
        }
        self.images.push(ImageCandidate {
            url: url.to_string(),
            label: label.chars().take(160).collect(),
            suggested,
        });
    }

    fn product_images(&mut self, value: &Value, label: &str) {
        match value {
            Value::String(url) => self.add(url, label, true),
            Value::Array(values) => {
                for value in values {
                    self.product_images(value, label);
                }
            }
            Value::Object(object) => {
                if let Some(value) = object.get("contentUrl").or_else(|| object.get("url")) {
                    self.product_images(value, label);
                }
            }
            _ => {}
        }
    }

    fn structured_products(&mut self, value: &Value) {
        match value {
            Value::Array(values) => {
                for value in values {
                    self.structured_products(value);
                }
            }
            Value::Object(object) => {
                let is_product = object.get("@type").is_some_and(|kind| {
                    let matches = |value: &Value| {
                        value.as_str().is_some_and(|s| {
                            s == "Product" || s.ends_with("/Product") || s == "ProductGroup"
                        })
                    };
                    matches(kind)
                        || kind
                            .as_array()
                            .is_some_and(|kinds| kinds.iter().any(matches))
                });
                if is_product {
                    if let Some(images) = object.get("image") {
                        self.product_images(
                            images,
                            object
                                .get("name")
                                .and_then(Value::as_str)
                                .unwrap_or("Product photo"),
                        );
                    }
                }
                for child in object.values() {
                    self.structured_products(child);
                }
            }
            _ => {}
        }
    }
}

// Choose the largest declared responsive source without rewriting signed/CDN URLs.
fn largest_source(value: &str) -> Option<&str> {
    // URLs end at whitespace, not at an internal comma (Cloudinary uses commas
    // in transformation paths). Only trailing commas separate bare candidates.
    let mut remaining = value;
    let mut best: Option<(&str, f64)> = None;
    loop {
        remaining = remaining.trim_start_matches(|c: char| c.is_ascii_whitespace() || c == ',');
        if remaining.is_empty() {
            break;
        }
        let end = remaining
            .find(|c: char| c.is_ascii_whitespace())
            .unwrap_or(remaining.len());
        let token = &remaining[..end];
        remaining = &remaining[end..];
        let url = token.trim_end_matches(',');
        let descriptor = if token.ends_with(',') {
            ""
        } else {
            let end = remaining.find(',').unwrap_or(remaining.len());
            let descriptor = remaining[..end].trim();
            remaining = &remaining[end..];
            descriptor
        };
        let size = if descriptor.is_empty() {
            Some(1.0)
        } else {
            descriptor
                .strip_suffix('w')
                .or_else(|| descriptor.strip_suffix('x'))
                .and_then(|number| number.parse::<f64>().ok())
                .filter(|number| number.is_finite() && *number > 0.0)
        };
        if let Some(size) = size {
            if !url.starts_with("data:") && best.is_none_or(|(_, previous)| size > previous) {
                best = Some((url, size));
            }
        }
    }
    best.map(|(url, _)| url)
}

pub fn extract(html: &str, page_url: Url) -> WebsiteImages {
    let document = Html::parse_document(html);
    let title = document
        .select(&selector("meta[property], meta[name]"))
        .find(|meta| {
            meta.value()
                .attr("property")
                .or_else(|| meta.value().attr("name"))
                .is_some_and(|name| name.eq_ignore_ascii_case("og:title"))
                && meta
                    .value()
                    .attr("content")
                    .is_some_and(|value| !value.trim().is_empty())
        })
        .and_then(|meta| meta.value().attr("content"))
        .map(str::trim)
        .map(str::to_owned)
        .or_else(|| {
            document
                .select(&selector("title"))
                .next()
                .map(|element| element.text().collect::<String>())
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty())
        });
    let base = document
        .select(&selector("base[href]"))
        .next()
        .and_then(|element| element.value().attr("href"))
        .and_then(|href| page_url.join(href).ok())
        .filter(|url| web_url(url.as_str()).is_ok())
        .unwrap_or_else(|| page_url.clone());
    let mut candidates = Candidates {
        base,
        seen: HashSet::new(),
        images: Vec::new(),
    };
    for script in document.select(&selector("script[type='application/ld+json']")) {
        if let Ok(value) = serde_json::from_str::<Value>(&script.inner_html()) {
            candidates.structured_products(&value);
        }
    }
    for meta in document.select(&selector("meta[property], meta[name]")) {
        let name = meta
            .value()
            .attr("property")
            .or_else(|| meta.value().attr("name"))
            .unwrap_or("");
        if matches!(
            name.to_ascii_lowercase().as_str(),
            "og:image"
                | "og:image:url"
                | "og:image:secure_url"
                | "twitter:image"
                | "twitter:image:src"
        ) {
            if let Some(url) = meta.value().attr("content") {
                candidates.add(url, "Page preview", true);
            }
        }
    }
    for element in document.select(&selector("img, picture source")) {
        let attrs = element.value();
        let label = attrs.attr("alt").unwrap_or("Website photo");
        let small = ["width", "height"].iter().any(|name| {
            attrs
                .attr(name)
                .and_then(|s| s.parse::<u32>().ok())
                .is_some_and(|size| size < 100)
        });
        let hint = format!(
            "{} {} {}",
            label,
            attrs.attr("class").unwrap_or(""),
            attrs.attr("src").unwrap_or("")
        )
        .to_lowercase();
        let decorative = [
            "logo", "icon", "sprite", "swatch", "spacer", "tracking", "payment",
        ]
        .iter()
        .any(|word| hint.contains(word));
        let suggested = !small && !decorative;
        let responsive = attrs
            .attr("data-srcset")
            .or_else(|| attrs.attr("srcset"))
            .and_then(largest_source);
        let url = responsive
            .or_else(|| attrs.attr("data-src"))
            .or_else(|| attrs.attr("data-lazy-src"))
            .or_else(|| attrs.attr("data-original"))
            .or_else(|| attrs.attr("src"));
        if let Some(url) = url {
            candidates.add(url, label, suggested);
        }
    }
    // Stable partition keeps structured product images ahead of generic page images.
    candidates.images.sort_by_key(|image| !image.suggested);
    WebsiteImages {
        page_url: page_url.to_string(),
        title,
        images: candidates.images,
    }
}

fn is_verification_page(html: &str) -> bool {
    let document = Html::parse_document(html);
    // Akamai (including Zara) can serve its verification interstitial as HTTP
    // 200. Detect the actual challenge markup, not a product's descriptive text.
    document.select(&selector("iframe[src]")).any(|frame| {
        frame
            .value()
            .attr("src")
            .is_some_and(|src| src.split('?').next() == Some("/interstitial/ic.html"))
    }) || document.select(&selector("meta[http-equiv]")).any(|meta| {
        meta.value()
            .attr("http-equiv")
            .is_some_and(|value| value.eq_ignore_ascii_case("refresh"))
            && meta
                .value()
                .attr("content")
                .is_some_and(|value| value.contains("bm-verify="))
    })
}

pub async fn find(value: &str) -> Result<WebsiteImages, String> {
    let (url, bytes) = fetch(value, MAX_PAGE_BYTES).await?;
    if crate::image_store::detect_image(&bytes).is_some() {
        return Ok(WebsiteImages {
            page_url: url.to_string(),
            title: None,
            images: vec![ImageCandidate {
                url: url.to_string(),
                label: "Linked photo".into(),
                suggested: true,
            }],
        });
    }
    let html = String::from_utf8_lossy(&bytes).into_owned();
    tauri::async_runtime::spawn_blocking(move || {
        let result = extract(&html, url);
        if result.images.is_empty() && is_verification_page(&html) {
            Err(BLOCKED_PAGE.to_string())
        } else {
            Ok(result)
        }
    })
    .await
    .map_err(|_| "The page could not be read. Try another link.".to_string())?
}

fn decode_image(bytes: &[u8]) -> Result<image::DynamicImage, String> {
    if crate::image_store::detect_image(bytes).is_none() {
        return Err("Choose a JPEG, PNG, or WebP photo.".into());
    }
    let mut reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|_| "This image could not be read.")?;
    let mut limits = Limits::default();
    limits.max_image_width = Some(12000);
    limits.max_image_height = Some(12000);
    limits.max_alloc = Some(100 * 1024 * 1024);
    reader.limits(limits);
    reader.decode().map_err(|_| {
        "This image is damaged, unsupported, or too large. Choose another photo.".into()
    })
}

pub async fn preview(value: &str) -> Result<String, String> {
    let (_, bytes) = fetch(value, MAX_IMAGE_BYTES).await?;
    tauri::async_runtime::spawn_blocking(move || {
        let thumbnail = decode_image(&bytes)?.thumbnail(360, 450);
        let mut encoded = Cursor::new(Vec::new());
        thumbnail
            .write_to(&mut encoded, image::ImageFormat::Png)
            .map_err(|_| "The photo preview could not be created.")?;
        Ok(format!(
            "data:image/png;base64,{}",
            STANDARD.encode(encoded.into_inner())
        ))
    })
    .await
    .map_err(|_| "The photo preview could not be created.".to_string())?
}

pub async fn import(
    value: &str,
    root: std::path::PathBuf,
) -> Result<crate::image_store::ManagedImage, String> {
    let (_, bytes) = fetch(value, MAX_IMAGE_BYTES).await?;
    tauri::async_runtime::spawn_blocking(move || {
        decode_image(&bytes)?;
        crate::image_store::import_bytes(&root, &bytes)
    })
    .await
    .map_err(|_| {
        "The photo could not be imported. Your current photo has not changed.".to_string()
    })?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn page(html: &str) -> WebsiteImages {
        extract(
            html,
            Url::parse("https://shop.example/products/dress").unwrap(),
        )
    }

    #[test]
    fn ranks_product_data_before_metadata_and_page_images_and_deduplicates() {
        let result = page(
            r#"
            <img src="/other.jpg" alt="Other garment">
            <script type="application/ld+json">{"@graph":[{"@type":["Thing","Product"],"name":"Blue dress","image":["/main.jpg",{"contentUrl":"//cdn.example/back.webp"}]}]}</script>
            <meta property="og:image" content="/main.jpg">
            <meta name="twitter:image" content="/social.png">
            <script type="application/ld+json">not valid JSON</script>
            <img src="/main.jpg#duplicate">
        "#,
        );
        assert_eq!(
            result
                .images
                .iter()
                .map(|i| i.url.as_str())
                .collect::<Vec<_>>(),
            vec![
                "https://shop.example/main.jpg",
                "https://cdn.example/back.webp",
                "https://shop.example/social.png",
                "https://shop.example/other.jpg",
            ]
        );
        assert_eq!(result.images[0].label, "Blue dress");
    }

    #[test]
    fn prefers_og_title_then_page_title() {
        assert_eq!(
            page(r#"<title>Fallback &amp; name</title><meta property="og:title" content="  Preferred &amp; name  ">"#).title.as_deref(),
            Some("Preferred & name")
        );
        assert_eq!(
            page("<title>Fallback &amp; name</title>").title.as_deref(),
            Some("Fallback & name")
        );
        assert_eq!(page("<title>  </title>").title, None);
    }

    #[test]
    fn resolves_base_lazy_and_responsive_images_and_keeps_decorations_as_fallbacks() {
        let result = page(
            r#"
            <base href="https://cdn.example/photos/">
            <img src="logo.png" width="32" alt="Shop logo">
            <img src="placeholder.png" data-src="dress.jpg?token=a&amp;size=large" alt="Dress">
            <picture><source srcset="small.webp 300w, big.webp 1200w"><img src="fallback.jpg"></picture>
            <img src="x.jpg" data-srcset="low.jpg 1x, high.jpg 2x">
            <img src="data:image/png;base64,invalid"><img src="file:///C:/secret.png">
            <img src="http://127.0.0.1/image.jpg">
        "#,
        );
        assert_eq!(result.images.len(), 5);
        assert_eq!(
            result.images[0].url,
            "https://cdn.example/photos/dress.jpg?token=a&size=large"
        );
        assert_eq!(result.images[1].url, "https://cdn.example/photos/big.webp");
        assert_eq!(result.images[3].url, "https://cdn.example/photos/high.jpg");
        assert!(!result.images[4].suggested);
    }

    #[test]
    fn limits_candidates_and_handles_empty_pages() {
        assert!(page("<html><p>No images</p></html>").images.is_empty());
        let html = (0..150)
            .map(|i| format!("<img src='/photo-{i}.jpg'>"))
            .collect::<String>();
        assert_eq!(page(&html).images.len(), MAX_CANDIDATES);
    }

    #[test]
    fn recognizes_success_status_verification_markup_without_matching_product_text() {
        assert!(is_verification_page(
            r#"<html><head><meta http-equiv="refresh" content="5; URL='/product?v1=123&amp;bm-verify=example'"></head><body><iframe src="/interstitial/ic.html"></iframe></body></html>"#
        ));
        assert!(is_verification_page(
            r#"<iframe src="/interstitial/ic.html?locale=en"></iframe>"#
        ));
        assert!(is_verification_page(
            r#"<meta http-equiv="Refresh" content="5; URL=/product?bm-verify=example">"#
        ));
        assert!(!is_verification_page("<p>No photos on this page</p>"));
        assert!(!is_verification_page(
            "<p>Instructions mention bm-verify= and /interstitial/ic.html</p>"
        ));
        assert!(!is_verification_page(
            r#"<meta http-equiv="refresh" content="5; URL=/new-product"><iframe src="/size-guide"></iframe>"#
        ));
    }

    #[test]
    fn responsive_sources_preserve_cloudinary_commas_and_signed_queries() {
        let html = r#"<img alt="Farrah jeans" src="https://assets.aritzia.com/image/upload/q_auto,f_auto/photo"
          srcset="https://assets.aritzia.com/image/upload/q_auto,f_auto,w_400/photo?token=a%2Cb 400w, https://assets.aritzia.com/image/upload/q_auto,f_auto,w_1800/photo?token=a%2Cb 1800w">"#;
        let result = page(html);
        assert_eq!(result.images.len(), 1);
        assert_eq!(
            result.images[0].url,
            "https://assets.aritzia.com/image/upload/q_auto,f_auto,w_1800/photo?token=a%2Cb"
        );
        assert_eq!(largest_source("one.jpg, two.jpg 2x"), Some("two.jpg"));
        assert_eq!(
            largest_source("data:image/png;base64,AAAA 1x, photo.jpg 2x"),
            Some("photo.jpg")
        );
        assert_eq!(
            largest_source("bad.jpg 0w, good.jpg 500w, invalid.jpg NaNx"),
            Some("good.jpg")
        );
    }

    #[test]
    fn rejects_local_addresses_and_unsafe_links() {
        for value in [
            "file:///C:/photo.jpg",
            "javascript:alert(1)",
            "https://user:password@shop.example/",
            "https://example.com:3000/",
            "http://127.1/",
            "http://[::1]/",
            "http://192.168.1.1/",
            "http://169.254.169.254/",
        ] {
            assert!(web_url(value).is_err(), "{value}");
        }
        for address in [
            "10.0.0.1",
            "100.64.1.1",
            "172.16.0.1",
            "224.0.0.1",
            "0.0.0.0",
            "::ffff:127.0.0.1",
            "fe80::1",
            "fc00::1",
            "2001:db8::1",
        ] {
            assert!(!public_ip(address.parse().unwrap()), "{address}");
        }
        assert!(public_ip("93.184.215.14".parse().unwrap()));
        assert!(public_ip("2606:4700:4700::1111".parse().unwrap()));
        assert!(web_url("https://shop.example/product?color=blue").is_ok());
    }

    #[test]
    fn validates_real_image_contents_before_import_and_preserves_original_bytes() {
        assert!(decode_image(b"<html>Access denied</html>").is_err());
        assert!(decode_image(&[0xff, 0xd8, 0xff, 0]).is_err());
        let photo = image::DynamicImage::new_rgb8(12, 15);
        let mut encoded = Cursor::new(Vec::new());
        photo
            .write_to(&mut encoded, image::ImageFormat::Png)
            .unwrap();
        let bytes = encoded.into_inner();
        assert_eq!(decode_image(&bytes).unwrap().width(), 12);
        let root = std::env::temp_dir().join(format!(
            "wordrop-url-import-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let first = crate::image_store::import_bytes(&root, &bytes).unwrap();
        let second = crate::image_store::import_bytes(&root, &bytes).unwrap();
        assert_ne!(first.reference, second.reference);
        assert_eq!(std::fs::read(root.join(&first.reference)).unwrap(), bytes);
        crate::image_store::remove(&root, &first.reference).unwrap();
        crate::image_store::remove(&root, &second.reference).unwrap();
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    #[ignore = "requires internet and WORDROP_IMPORT_TEST_URL pointing to a public product page"]
    fn live_website_smoke() {
        let url = std::env::var("WORDROP_IMPORT_TEST_URL").expect("set WORDROP_IMPORT_TEST_URL");
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        runtime.block_on(async {
            let result = find(&url).await.unwrap();
            println!("Found {} candidates", result.images.len());
            assert!(!result.images.is_empty());
            let mut previews = 0;
            for candidate in result.images.iter().take(3) {
                match preview(&candidate.url).await {
                    Ok(_) => previews += 1,
                    Err(error) => println!("Preview failed: {}: {error}", candidate.url),
                }
            }
            assert!(
                previews > 0,
                "no usable previews among the first three images"
            );
            println!("Validated {previews} previews");
        });
    }
}

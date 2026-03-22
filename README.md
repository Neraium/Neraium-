# Neraium Website

This repository contains the static website for Neraium.

## Project structure

- `index.html`, `platform.html`, `technical.html`, `governance.html`, `contact.html` — built output (do not edit by hand)
- `_partials/` — shared `<head>`, header, and footer fragments
- `_pages/` — per-page main content
- `build.py` — assembles the root `*.html` files from the above
- `styles.css` - shared site styles
- `site.webmanifest`, `robots.txt`, `sitemap.xml` - site metadata
- image and icon files (`.png`, `.jpg`, `.ico`) used across pages

## Edit pages

After changing `_partials/`, `_pages/`, or `build.py`, regenerate the site:

```bash
python3 build.py
```

## Run locally

Because this is a static site, you can open any HTML file directly in a browser, or serve it locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Receive/export the website code

To package the full website code into a zip archive:

```bash
zip -r neraium-website-code.zip . -x ".git/*"
```

This creates `neraium-website-code.zip`, which you can share or download.

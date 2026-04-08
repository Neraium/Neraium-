# Neraium Website

This repository contains the static website for Neraium.

## Project structure

- `index.html` - home page
- `platform.html` - platform overview page
- `technical.html` - technical details page
- `contact.html` - contact/briefing page
- `styles.css` - shared site styles
- `site.webmanifest`, `robots.txt`, `sitemap.xml` - site metadata
- image and icon files (`.png`, `.jpg`, `.ico`) used across pages

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

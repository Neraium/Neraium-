# Neraium Website

This repository contains the static public website for Neraium.

## Project structure

- `index.html` - home page
- `platform.html` - platform overview
- `technical.html` - use cases
- `pilot.html` - pilot program overview
- `methodology.html` - evaluation and pilot verification methodology
- `security.html` - security and data-handling overview
- `operator-brief.html` - one-page operator/pilot brief
- `contact.html` - pilot intake/contact page
- `styles.css` - shared site styles
- `scripts.js` - navigation, analytics hooks, forms, and FAQ behavior
- `site.webmanifest`, `robots.txt`, `sitemap.xml`, `.well-known/security.txt` - site metadata
- `tests/test_site.py` - static-site checks for links, anchors, alt text, SEO metadata, and sitemap coverage
- image, PDF, and icon files used across pages

## Run locally

Because this is a static site, you can open any HTML file directly in a browser, or serve it locally:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Run checks

```bash
python3 -m unittest discover -s tests
```

## Receive/export the website code

To package the full website code into a zip archive:

```bash
zip -r neraium-website-code.zip . -x ".git/*"
```

This creates `neraium-website-code.zip`, which you can share or download.

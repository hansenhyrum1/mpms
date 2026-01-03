# MPMS Website

## Overview

This is a static marketing site (HTML/CSS/JS) that uses Firebase for the contact form backend.
The site can be hosted on GitHub Pages; Firebase Functions and Firestore run separately in Firebase.

## Project structure

- Root `*.html` files are the pages.
- `main.css` contains all styles.
- `assets/` holds images and downloads.
- `scripts/` holds small utilities (header/footer sync).
- `partials/` holds shared header/footer templates.
- `functions/` contains Firebase Cloud Functions (contact form backend).

## Editing content

- Update text directly in the relevant `*.html` file.
- Replace images in `assets/` and keep file names consistent to avoid broken links.
- Services subpages live at:
  - `credentialing.html`
  - `coding-and-billing.html`
  - `ar-follow-up.html`
  - `patient-collections.html`

## Styling

- Global styles are in `main.css`.
- Try to keep font sizes and spacing consistent with existing patterns.
- Colors are already set; avoid changing them unless requested.

## Layout sync (header/footer)

All page headers and footers are managed as shared partials and synced into each HTML page.

1) Edit the partials:
- `partials/header.html`
- `partials/footer.html`

2) Sync the pages:
```
python scripts/sync-layouts.py
```
Or on Windows:
```
scripts\sync-layouts.cmd
```

Notes:
- The sync script replaces the content between `<!-- HEADER START -->` / `<!-- HEADER END -->` and
  `<!-- FOOTER START -->` / `<!-- FOOTER END -->` in each root HTML file.
- Avoid manual edits inside those marker blocks; re-run the sync script instead.
- Requires Python 3 available on your PATH.

## Contact form (Firebase)

- The contact form is in `contact.html`.
- Form submissions go to a Firebase Cloud Function endpoint (see `functions/index.js`).
- Form submissions are stored in Firebase (Firestore).

## Security notes

- Do NOT commit secrets, passwords, or private keys to this repo.
- reCAPTCHA site keys are public; reCAPTCHA secret keys must stay in Firebase Secret Manager.
- Firebase config values in the frontend are public by design; do not treat them as secrets.
- If you add any new credentials, store them in Firebase/Google Cloud and keep them out of the repo.

## Deploy

- Static site: publish the root files to GitHub Pages.
- Backend: deploy Firebase Functions separately from the `functions/` directory.

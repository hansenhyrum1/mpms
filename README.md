# MPMS Website

## Overview

This is a static marketing site (HTML/CSS/JS) that uses Firebase for the contact form backend.
The site can be hosted on GitHub Pages; Firebase Functions and Firestore run separately in Firebase.

## Project structure

- Root `*.html` files are the pages.
- `main.css` contains all styles.
- `assets/` holds images and downloads.
- `scripts/` holds client-side JavaScript (layout + navigation).
- `header.html` and `footer.html` are shared layout partials.
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

## Layout includes (header/footer)

The shared header and footer are injected on page load.

1) Edit the shared partials:
- `header.html`
- `footer.html`

2) Each page includes placeholders:
- `<div id="site-header"></div>`
- `<div id="site-footer"></div>`

3) `scripts/layout.js` loads the partials and `scripts/nav.js` initializes the menu.

## Contact form (Firebase)

- The contact form is in `contact.html`.
- Form submissions go to a Firebase Cloud Function endpoint (see `functions/index.js`).
- Form submissions are stored in Firebase (Firestore).
- Admins can set the notification recipient in `admin-contact.html` (stored at `siteConfig/contact`).
- Email notifications use SMTP. Configure Firebase secrets:
  - `SMTP_HOST` (example: `smtp.gmail.com`)
  - `SMTP_PORT` (example: `465`)
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM` (the from/reply email, typically same as user)

## Blog posts

- Create and edit posts in `admin-blog-editor.html` (requires Firebase Auth sign-in).
- Blog admin list lives in `admin.html`.
- Staff admin list lives in `admin-staff.html`.
- Posts render on `blog.html` and open in `blog-post.html?id=...`.
- Posts are stored in Firestore in the `blogPosts` collection.

## Security notes

- Do NOT commit secrets, passwords, or private keys to this repo.
- reCAPTCHA site keys are public; reCAPTCHA secret keys must stay in Firebase Secret Manager.
- Firebase config values in the frontend are public by design; do not treat them as secrets.
- If you add any new credentials, store them in Firebase/Google Cloud and keep them out of the repo.

## Deploy

- Static site: publish the root files to GitHub Pages.
- Backend: deploy Firebase Functions separately from the `functions/` directory.

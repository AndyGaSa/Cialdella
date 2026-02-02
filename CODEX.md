# CIALDELLA - AI PROJECT BRIEF (CODEX / CHATGPT)

## What this project is
Cialdella is a small, static blog with an admin-style dashboard. It lets you list, create, and edit blog posts, plus manage a "likes" view that stores shared likes between Andy and Fiona. Data is stored in Supabase (tables + storage bucket).

## How it works
- Frontend is plain HTML/CSS/JS with Vue loaded from CDN. No build step.
- Supabase is used for:
  - posts table (blog posts)
  - likes table (shared likes between Andy and Fiona)
  - storage bucket media (images/audio for posts and likes)
- External assets:
  - Google Fonts (Fraunces + Space Grotesk)
  - Local `assets/` images (foto, icons)
- The UI has views for:
  - list (all posts)
  - detail (single post)
  - editor (create/edit post)
  - likes (list of likes filtered by person)
  - likes-detail (single like detail)
- Post body and likes description support rich text (bold, underline, highlight colors).
- Highlight removal is done via the clear button (slashed circle) in the subrayar group.
- Image lightbox with download/share is available on post/like images.

## Supabase data model
Posts table (see README for SQL):
- columns: id, title, body, media (json), created_at, updated_at
  - body stores HTML produced by the editor

Likes table (used in app.js):
- columns: id, title, description, image_url, created_at, person
- person values are "andy" or "fiona"
  - description stores HTML produced by the editor

Storage:
- bucket: media
- post media stored at: {postId}/{uuid}.{ext}
- likes images stored at: likes/{uuid}.{ext}
- CSS uses a public media image (FONDO.jpg) as a background texture.

## Key files
- index.html: app markup and CDN script includes
- styles.css: all styling
- app.js: all logic, Supabase client, views, CRUD
- README.md: setup instructions and SQL policies
- CNAME: GitHub Pages custom domain (if configured)

## Edit access
- Edit code is a shared secret in app.js (EDIT_CODE). It gates create/update actions.
- The code is stored in sessionStorage under "cialdella_code".

## How to run
- Open index.html locally or publish to GitHub Pages (no build).
- Supabase URL and anon key are hardcoded in app.js.

## Common tasks for AI
- Update UI/UX: edit index.html + styles.css
- Change behavior or logic: edit app.js
- Adjust Supabase setup: update README.md SQL and policies
- Keep the likes feature intact: it is a core view of the site

## Notes / constraints
- Keep this as a static site (no build system).
- Do not remove the likes view or the Andy/Fiona pairing.
- Preserve existing Supabase structure unless asked to change it.
- Post list cards clamp the excerpt to 3 lines and preserve line breaks.
- Cards can show a wax seal image (Andy or Fiona) when the last non-empty line of the post body ends with A/F.
- The seal ignores trailing punctuation when checking the last letter.
- Seal images live in `assets/andyseal.png` and `assets/fionaseal.png` with a centered A/F letter overlay.
- Image media items render without the padded background container for cleaner mixed orientations.

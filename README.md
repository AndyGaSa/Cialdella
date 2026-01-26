# CIALDELLA

Cute minimal blog with Supabase backend.

## Publish on GitHub Pages
1. Create a GitHub repo (e.g. `cialdella`).
2. Upload `index.html`, `styles.css`, and `app.js` from this folder.
3. GitHub repo → Settings → Pages:
   - Source: Deploy from a branch
   - Branch: `main` / `/ (root)`
4. Wait a minute and open the URL shown there.

## Supabase setup (once)
Run these in the Supabase SQL editor:

```sql
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  media jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table public.posts enable row level security;

create policy "posts read" on public.posts
for select
to anon, authenticated
using (true);

create policy "posts insert" on public.posts
for insert
to anon, authenticated
with check (true);

create policy "posts update" on public.posts
for update
to anon, authenticated
using (true)
with check (true);
```

Create a public storage bucket named `media`, then run:

```sql
create policy "media read" on storage.objects
for select
to anon, authenticated
using (bucket_id = 'media');

create policy "media write" on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'media');

create policy "media update" on storage.objects
for update
to anon, authenticated
using (bucket_id = 'media')
with check (bucket_id = 'media');
```

## Secret code
The edit code is set in `app.js`:

```js
const EDIT_CODE = "tengo1bigote";
```

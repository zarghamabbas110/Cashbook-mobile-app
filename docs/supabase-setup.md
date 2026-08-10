# Connecting Supabase

What this gets you: one shared book across every phone in the family, live.
An entry added on one device appears on the others in about a second.

You have a Supabase account already, so this is roughly twenty minutes of
clicking. Do the steps in order — a couple of them depend on values produced
by earlier ones.

---

## 1. Create the project

Supabase dashboard → **New project**.

| Field | What to put |
|---|---|
| Name | `rozana` |
| Database password | Generate one and save it in your password manager |
| Region | **Singapore** or **Mumbai** — closest to Pakistan, so the app feels fast |
| Plan | Free |

Give it a minute or two to finish provisioning.

Use a **separate project** from your other app. Sharing one would mean both
apps' tables sit in the same database with the same auth users, and a mistake
in one could reach the other. Free projects are unlimited in number.

---

## 2. Create the tables

Left sidebar → **SQL Editor** → **New query**.

Open `docs/supabase-schema.sql` from this repo, copy the whole file, paste it
in, and press **Run**. It should finish with "Success. No rows returned."

That single file creates every table and — more importantly — the row-level
security policies. Those are what make roles real: a viewer is refused by the
database itself, not merely shown fewer buttons in the app. Without them,
anyone who opened the browser console could write to your books.

Check it worked: **Table Editor** should now list `spaces`, `space_members`,
`people`, `accounts`, `categories` and `entries`, each showing a green
**RLS enabled** badge.

---

## 3. Turn on Google sign-in

**Authentication → Sign In / Providers → Google → Enable.**

It asks for a Client ID and Client Secret, which come from Google, not
Supabase. Copy the **Callback URL** Supabase shows you first — you will need
to paste it into Google.

Then, in a new tab, [Google Cloud Console](https://console.cloud.google.com):

1. Create a project (or reuse one) → **APIs & Services** → **OAuth consent screen**
   - User type **External**, app name `Rozana`, your email for support and developer contact
   - Under **Audience**, add your own Google account as a **Test user**
   - Leave it in Testing mode. Publishing is only needed once strangers use it
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type **Web application**
   - **Authorised JavaScript origins**: `https://zarghamabbas110.github.io`
   - **Authorised redirect URIs**: the Callback URL you copied from Supabase.
     It looks like `https://<project-ref>.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret** back into Supabase, and save.

---

## 4. Tell Supabase where the app lives

**Authentication → URL Configuration.**

- **Site URL**: `https://zarghamabbas110.github.io/Cashbook-mobile-app/`
- **Redirect URLs**: add both of these
  - `https://zarghamabbas110.github.io/Cashbook-mobile-app/`
  - `http://localhost:5173/` — so the app still works while being developed

Getting this wrong is the single most common cause of "sign-in spins and comes
back logged out", so double-check the trailing slashes.

---

## 5. Send me two values

**Project Settings → API**:

- **Project URL** — `https://<something>.supabase.co`
- **anon public** key — a long string starting `eyJ...`

Both are safe to share and safe to ship inside the app. The anon key is
designed to be public; it grants nothing on its own, because every table is
guarded by the policies from step 2. 

**Never send me the `service_role` key.** That one bypasses all security. It
is on the same settings page, which is exactly why it is worth naming.

---

## One thing I need to warn you about

Signing in with Google normally works by sending you off to Google's website
and back. That breaks inside a home-screen web app on iPhone: iOS treats
leaving the site as leaving the app, so it kicks you out to Safari and you can
end up signed in *there* rather than in the app on your home screen.

So I will not use the ordinary redirect flow. Instead:

- **Google sign-in stays inside the app**, using Google's newer in-page
  sign-in rather than a redirect. No bouncing out to Safari.
- **A six-digit email code as the fallback.** You type your email, a code
  arrives, you type it in. It never leaves the app, so it works everywhere,
  including on any phone where the Google flow misbehaves.

You will not notice any of this — it is a note so that when you see two
sign-in options on the screen, you know why the second one is there.

---

## What happens to the data you have entered by then

Whatever you have been recording on your phone up to that point is not lost.
Once sync is live, the app will offer to upload your existing device data into
your new cloud space the first time you sign in.

Take a backup anyway, from **Settings → Save a backup**, before we switch over.
It costs one tap and it means there is no version of this where your entries
disappear.

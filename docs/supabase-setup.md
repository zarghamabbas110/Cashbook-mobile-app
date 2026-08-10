# Connecting Supabase

What this gets you: one shared book across every phone in the family, live.
An entry added on one device appears on the others in about a second.

**Four steps, about five minutes.** No Google Cloud, no OAuth consent screen,
no email provider. An earlier version of this guide had all of that; the
sign-in design below removed the need for it.

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

Use a **separate project** from your other app. Sharing one would put both
apps' tables and users in the same database, where a mistake in one could
reach the other. Free projects are unlimited.

---

## 2. Create the tables

Left sidebar → **SQL Editor** → **New query**.

Open `docs/supabase-schema.sql` from this repo, copy the whole file, paste it
in, press **Run**. It should end with "Success. No rows returned."

That one file creates every table and the row-level security policies. Those
policies are what make roles real: a viewer is refused by the database itself,
not merely shown fewer buttons. Without them, anyone who opened a browser
console could write to your books.

To check: **Table Editor** should now list `spaces`, `space_members`,
`people`, `accounts`, `categories`, `entries` and `space_invites`, each with a
green **RLS enabled** badge.

---

## 3. Turn on anonymous sign-in

**Authentication → Sign In / Providers → Anonymous sign-ins → Enable.**

One toggle. This is what lets a phone get an identity by opening an invite
link, with nothing to type and no account to create.

Leave every other provider off.

---

## 4. Send me two values

**Project Settings → API**:

- **Project URL** — `https://<something>.supabase.co`
- **anon public** key — a long string starting `eyJ...`

Both are safe to share and safe to ship inside the app. The anon key is
designed to be public; it grants nothing on its own, because every table is
guarded by the policies from step 2.

**Never send the `service_role` key.** It sits on the same page and it
bypasses all security, which is exactly why it is worth naming.

---

## How signing in will work

You asked for something simpler than Google accounts. Here is what I am
building, and the one thing you should understand about it.

**For you, setting up:** you are already signed in on your phone. Nothing
changes.

**For a family member:** you tap **Invite** next to their name, which produces
a link. You send it on WhatsApp. They tap it, the app opens, it says
"You've been added as Ayesha", and asks them to pick a four-digit code. Done.
No account, no password, no email, nothing to install beyond adding it to
their home screen.

**After that:** the app asks for their four digits when they open it.

### The part worth understanding

You said "just a simple four-digit code and then he can have the access". I
have built something that *feels* exactly like that, but I have not made the
four digits the thing that protects your books, and I want to be straight
about why.

Four digits is ten thousand possibilities. A person can try them all with a
script in under a minute. If the code were the only credential, anyone who
found the app's address could walk into your family's finances.

So the security actually rests on **the invite link**, which carries a long
random token that cannot be guessed. Once a phone has used that link, that
phone is trusted, permanently. The four-digit code is a lock on the phone
itself — it stops your children, or whoever picks up an unlocked handset,
from opening the app. That is a real and worthwhile job, and it is the job
four digits is suited to.

The experience is what you asked for. The strength sits in the link rather
than the code.

### Consequences to know about

- **Treat an invite link like a key.** Anyone who opens it joins your books.
  They expire after 14 days and stop working once used, but don't post one
  in a group chat you don't control.
- **Clearing browser data signs that phone out.** Anonymous identities live in
  the browser's storage. You would just send a fresh invite link.
- **Losing a phone means removing that person and re-inviting them.** I will
  make that one tap on the Family screen.

If you later want the extra safety of a recoverable account — so a lost phone
does not need a new invite — I can add an optional "attach my email" step
without disturbing any of the above.

---

## Your existing entries

Whatever you have recorded on your phone by then is not lost. The first time
you sign in after sync goes live, the app will offer to upload your device's
data into the new cloud space.

Take a backup first anyway, from **Settings → Save a backup**. One tap, and it
means there is no version of this where your entries disappear.

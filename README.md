# Rozana

A shared cash book for families. One app for iPhone, Android and desktop.

Inspired by the simplicity of Cashbook, rebuilt around how a household
actually thinks about money rather than how a shop does.

---

## The money model

Three ideas carry the whole app. Everything else is a view on top of them.

**An account is a place money physically sits** — a wallet, a bank account,
a savings pot. Its balance is every entry that ever touched it, added up, so
the number in the app always equals the number in your pocket. What the money
was *for* is a category, not a separate book.

**A month is a lens, not a container.** You never create a book for August.
Every entry carries a date, so August is simply the entries that count in
August. That is why the carry-forward is automatic: a period's closing balance
is the next one's opening balance, always, with nothing to copy over by hand.

Every entry carries **two** dates, and this is deliberate:

| Field | Meaning | What follows it |
|---|---|---|
| `datePaid` | When the money actually moved | Account balances |
| `period` | Which month it counts against | Reports and carry-forward |

They match by default. They differ on purpose when a bill is settled early or
late — a maid's August salary paid on 2 September still belongs to August.
Balances obey reality; reports obey intent. Both stay correct.

**A transfer is not spending.** Moving your own money from the bank into your
pocket is stored as a linked pair of entries and excluded from every total.
Without this, every withdrawal you ever made would inflate your yearly income
and your yearly spending at the same time.

A third axis, **household vs personal**, sits on each entry. Personal spending
stays in one person's ledger; household spending rolls up across everyone into
one monthly view no matter who paid it.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

Node 22 or newer.

---

## Putting it on a phone

There is no app store involved. The app is a web app that installs to the
home screen and then runs full screen with its own icon.

**iPhone / iPad** — open the site in **Safari** (not Chrome), tap the Share
button, then **Add to Home Screen**.

**Android** — open the site in Chrome and accept the **Install app** prompt,
or use the menu → **Add to Home screen**.

Once installed it opens like any other app: no address bar, no browser
toolbars, its own icon. A service worker caches the app shell, so it opens
instantly and keeps working when the signal drops.

---

## Where the data lives

**Today: on the device only.** Everything is kept in the browser's storage on
whichever phone or computer you used. Nothing is uploaded anywhere, which also
means nothing syncs between devices yet.

Because of that, **Settings → Save a backup** matters. It writes a single JSON
file containing everything, which **Restore from a backup** reads back. Your
data is never trapped in the app.

**Next: Supabase.** `docs/supabase-schema.sql` is the schema that turns this
into a shared, synced app — tables plus the row-level security policies that
make roles real. A viewer will be refused by the database, not merely shown
fewer buttons. To connect it, implement the three methods of the `Backend`
interface in `src/lib/store.ts` against Supabase and call `setBackend`. No
screen needs to change.

---

## Layout

```
src/
  lib/
    types.ts    the money model, and why it is shaped this way
    money.ts    currency formatting, dates, period arithmetic
    select.ts   balances, period totals, carry-forward, breakdowns
    store.ts    state, mutations, persistence behind a swappable Backend
    export.ts   CSV export and the phone share sheet
    seed.ts     sample data so the app has something to show
  screens/      Home, Ledger, Report, People, Settings
  components/   Icon set, entry sheet, account sheet, shared bits
  styles.css    design tokens and every component style
docs/
  supabase-schema.sql
```

Money is stored as an integer count of minor units — paisa for rupees — so
arithmetic is exact. No monetary value is ever held in a floating-point number.

---

## Deploying

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push. Enable it once at **Settings → Pages → Source → GitHub Actions**.

The build reads `BASE_PATH`, so the same source serves from a custom domain
(`/`) or from a Pages sub-path (`/<repo>/`).

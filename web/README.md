# Events Tracker — Web

The browser version of the EventsTracker iOS app. This folder is self-contained;
the Swift app in the parent folder is untouched.

## How to run it

Open Terminal and run these two commands. The first one is only needed once.

```bash
cd ~/Documents/EventsTracker/web
npm install
```

Then, every time you want to work on it:

```bash
npm run dev
```

Your browser opens at `http://localhost:5173`. Leave that Terminal window
running while you work — edits to the code appear in the browser instantly.
Press `Control-C` in Terminal to stop it.

### Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app for local development |
| `npm test` | Runs the automated checks |
| `npm run typecheck` | Checks for type mistakes without building |
| `npm run build` | Produces the finished files in `dist/` for publishing |
| `npm run preview` | Views the built files exactly as they'd be published |

## Getting your iPhone data in

Two routes, both through the **Data** button in the toolbar.

**From the CSV export (easiest).** In the iOS app, tap the share icon, select
all things and a date range covering everything, and export. Send the file to
your Mac, then import it here. Every log comes across with its time, location
and note. Colours do not — the CSV has no colour column — so they are assigned
from a validated set and can be changed afterwards.

**From `things.json` (complete).** This is the app's internal save file, not
something it exports. Pull it with Xcode: Window -> Devices and Simulators ->
select your iPhone -> Installed Apps -> EventsTracker -> the gear icon ->
Download Container. Right-click the downloaded `.xcappdata`, Show Package
Contents, then `AppData/Documents/things.json`. This route keeps your colours.

Dates are converted automatically either way. The iPhone writes them as a
number of seconds since 2001 rather than as text — see `src/domain/dates.ts`.

**Back up first.** Importing replaces everything currently stored in the
browser. The **Data** panel has a Download backup button for exactly this.

## Where things live

```
src/
├── domain/      The rules of the app. Plain TypeScript, no React.
│   ├── types.ts     Thing, LogEntry, ColorData, LocationData
│   ├── dates.ts     Date reading, and local-time grouping helpers
│   ├── color.ts     Stored colour <-> CSS and hex
│   └── things.ts    Sorting, searching, creating things and logs
├── storage/     Reading and writing saved data
│   ├── normalize.ts      Turns an unknown file into trustworthy data
│   ├── normalize.test.ts Automated checks for the above
│   └── storage.ts        Browser storage, backup export, file download
├── state/
│   └── useStore.ts   The live list of things (replaces the iOS DataStore)
├── components/  The visible pieces of the screen
└── App.tsx      The main screen (replaces the iOS ContentView)
```

`domain/` and `storage/` contain no React on purpose. They hold the behaviour
that has to match the iOS app exactly, and keeping them separate means they can
be tested on their own.

## Where the data is kept

In the browser's `localStorage`, under the key `eventstracker.things.v1`. That
is per-browser and per-device — it does not sync, and clearing site data erases
it. Use the backup export for anything you care about.

Unlike the iOS app, if the saved data cannot be read, this app **stops and says
so** rather than showing an empty list. That prevents a damaged file being
overwritten with nothing on the next tap.

## Migration status

Done:

- Domain model ported to TypeScript
- Browser storage, with import of the iOS `things.json`
- Thing grid: tap to log, search, sort, add, edit, delete
- Analytics calculations (`src/domain/analytics.ts`), with 22 tests proving they
  match the iOS behaviour
- Analytics screen: frequency and time-of-day charts, thing filters, date range,
  grouping options, legend and hover tooltips

Not built yet:
- Thing detail screen and log editing
- CSV export
- Maps and location capture
- Multi-language support
- Installable app / offline support

## A note on `node_modules`

This folder is shared with a Linux workspace, but `node_modules` can only hold
one operating system's files at a time. If a tool ever fails with a message
about a missing `@rollup/...` or `@esbuild/...` package, the fix is:

```bash
cd ~/Documents/EventsTracker/web
rm -rf node_modules
npm install
```

Nothing in `src/` is affected — it is only the downloaded dependencies.

## About location

The iOS app asked for location the moment it launched and tracked continuously.
A website doing that is rude, so here it is a switch: press **Tag location** in
the toolbar. Until it is on, no permission prompt appears and entries are saved
without a location.

Once on, it behaves like the phone — a watcher keeps the latest position ready,
so tapping a tile stamps the entry instantly. Logging never waits for or depends
on a location fix: if no position is known, the entry saves without one.

Browsers only allow location on secure pages. `localhost` counts as secure, so
this works in development. If the app is ever published, it must be served over
`https` for the switch to work.

## Putting it on your phone

The app is a PWA — a website that installs like an app. Publishing it is a
one-time setup, after which every push updates the live version automatically.

### One-time setup

1. Push this repository to GitHub if it isn't there already.
2. On GitHub, open the repository's **Settings** -> **Pages**.
3. Under *Build and deployment*, set **Source** to **GitHub Actions**.
4. Push any change inside `web/`. The workflow in
   `.github/workflows/deploy-web.yml` builds, type-checks, runs the tests, and
   publishes. Watch it on the **Actions** tab.
5. When it finishes, the Actions run shows the live URL — it will look like
   `https://<your-username>.github.io/EventsTracker/`.

The workflow refuses to publish if the type check or the tests fail, so a broken
build cannot reach the live site.

### Installing it

- **iPhone:** open the URL in Safari, tap Share, then *Add to Home Screen*.
- **Android:** open in Chrome and accept the install prompt.
- **Mac or PC:** an install icon appears in the address bar in Chrome or Edge.

Once installed it opens without browser chrome, keeps its own icon, and works
offline. Map tiles need a connection the first time, but recently viewed areas
are kept for a month.

### Your data does not travel

Everything lives in the browser's storage on the device where you entered it.
Publishing the app publishes the *program*, not your entries. Installing it on
your phone gives you an empty app until you import a backup there.

That also means the phone copy and the desktop copy are separate. To move data
between them, use **Download backup** on one and import the file on the other.

## Languages

The app appears in English, English (UK), German, Spanish, French or Italian.
It picks the browser's language on first visit and remembers any change you
make from the picker in the toolbar.

Note that the iOS app was *not* actually translated — its six `.lproj` folders
exist but every one of them is empty, so the phone shows English whatever the
device is set to. These translations are new.

### Adding or changing a string

1. Add the key and English text to `src/i18n/locales/en.ts`.
2. Add the same key to `de.ts`, `es.ts`, `fr.ts` and `it.ts`.
3. Run `npm test`.

The tests fail if any language is missing a key, has a key English doesn't, has
an empty string, or uses different `{placeholders}` from the English — which is
how translations normally rot without anyone noticing.

British English (`en-GB.ts`) is different: it lists only the few words that
differ from `en` and falls back for everything else.

For text that changes with a number, add two keys ending `_one` and `_other` and
call `tc('key', count)`. Which form is used follows each language's own rules
via `Intl.PluralRules`, not an English-style `count === 1` check.

### Where messages come from

Code that runs away from the screen — the CSV importer, the storage layer,
location handling — never builds an English sentence. It reports a translation
key, and the interface turns that into words in the current language. This is
why import warnings appear in German when the app is in German.

## Appearance

The picker in the toolbar offers **System**, **Light** and **Dark**, the same
three choices the iOS app had.

System is the default and follows the device — including switching by itself if
the device switches at sunset. Choosing Light or Dark overrides that until you
change it back.

Under the bonnet this sets a `data-theme` attribute on the page, and the
stylesheet reacts. Dark is declared twice in `src/styles.css`, once under
`prefers-color-scheme` for System and once under `[data-theme="dark"]` for the
explicit choice. That looks like duplication and is not: without both, either
the device setting or the in-app choice would be ignored. There is a long
comment at the top of the file saying so.

## Rearranging the tiles

Set the sort menu to **Manual**, press **Reorder**, then drag. On a phone,
press and hold a tile for a moment first — a plain swipe still scrolls the page.

Reordering is deliberately limited to Manual sort with an empty search box,
matching the iOS app. In any other sort the order is worked out from the data,
so a dragged tile would spring straight back; and while searching, the visible
tiles are only part of the list, so a drop position would not mean anything.

Keyboard: tab to a tile, press space, use the arrow keys, press space to drop.

## The toolbar

The app name sits on its own line, with five icons on the line beneath it —
the same arrangement the iOS toolbar had, but stacked so nothing is squeezed on
a narrow phone.

| Icon | What it does |
| --- | --- |
| Magnifier | Shows the search box. Closing it clears the search. |
| Two arrows | Sort order: Date Created, A–Z, Z–A, Manual. Remembered between visits. |
| Half-filled circle | Appearance: System, Light, Dark |
| Map pin | Location tagging on or off. Lit when recording. |
| Three lines | The main menu |

The main menu holds everything reached now and then rather than constantly:

- **View** — Things, Analytics, Map
- **Actions** — Data (import, export, backup), and Edit / Reorder
- **Language** — the six languages

An icon that is lit blue means that setting is currently on — search in use, or
location being recorded. The icons are 44px, the size a fingertip reliably hits.

Choosing **Edit** from the menu also switches to the Things screen, since
editing only means anything there.

## Staying clear of the phone's own furniture

Installed on an iPhone, this app draws behind the status bar so its colour runs
to the very top of the screen. Without care, the clock and battery would sit on
top of the app's heading.

The layout adds `env(safe-area-inset-*)` to its padding — the browser's own
measurement of how much room the phone needs at each edge: status bar or notch
at the top, home indicator at the bottom, rounded corners in landscape. The main
page, the dialogs and the undo toast all use it.

This only works because `index.html` sets `viewport-fit=cover`. Without that,
the insets all report zero and the padding silently does nothing.

On a desktop every inset is zero, so the layout is unchanged there.

## The analytics screen

Above the chart: which chart, the date range, and how to group. Below it: the
key, and a folded-away **Filter** section.

The filter sits below the chart deliberately. The chart is what the screen is
for, and with 27 things a wall of filter chips above it means scrolling past the
controls to reach what you came to see.

Collapsed, that section is simply the legend — which line is which. Expanded, the
same list becomes switches, with **All**, **Busiest 5** and **None** at the top.

The chart opens showing everything. Past about eight lines a chart gets hard to
read and there are only eight reliably distinct colours, so **Busiest 5** is
there as a one-tap way back to something legible.

## Categories

Things are grouped into categories. One is the **default**: it sits at the top of
the home screen, is always open, and is where new things go.

**The default category cannot be deleted.** That is the rule the rest depends on
— because it always exists, deleting any other category always has somewhere
safe to move its things to. Make a different category the default and the old
one becomes deletable.

Other categories fold away. Which ones you left open is remembered per device.
Searching temporarily opens any category holding a match, and hides the ones
with none, so a search never appears to find nothing.

**Categories** in the main menu handles the rest: add, rename in place, drag to
reorder, choose the default, delete. A Thing's category is a dropdown in its
edit dialog, shown once there is more than one category to choose between.

Deleting a category states how many things are inside and offers both answers
explicitly — keep them and move them to the default, or delete them along with
their history. Neither is preselected as a plain "OK".

### Migration

Data saved before categories existed gets one category named **General**, with
everything in it, made the default. This happens on load, so old backups and CSV
imports keep working. The same code repairs anything that has drifted — a thing
pointing at a deleted category, for instance — so that can never become a crash.

`General` is stored as ordinary text rather than a translated string, because it
becomes a name you own and can rename.

# Oakwood Junk Removal

A single hand-written `index.html` — no framework, no bundler, no runtime
JavaScript beyond what the page already has. The only thing that turns a
visitor into a lead is the Formspree-backed quote form, so this repository
carries an automated guard against the page silently breaking it.

## What the guard checks

The suite in `test/` runs the same assertions against both `index.html` and
the built `dist/index.html`, so a build step can never silently diverge from
the page a visitor actually sees, and one further test checks what that build
publishes at all:

- **`test/form-contract.test.js`** — the quote form's lead-path contract:
  exactly one `<form>` on the page; its `action` is an absolute `https` URL;
  its `method` is `POST`; the `name`, `email`, `address` and `job` fields are
  each `required` and associated with a non-empty `<label>`; the hidden
  `_next` field is an absolute `https` URL that shares an origin with the
  page's own `<link rel="canonical">`.
- **`test/navigation.test.js`** — the page's internal navigation: every
  in-page (`#…`) link resolves to a real element `id`; the page has exactly
  one `<h1>`; at least one link points at the section containing the quote
  form.
- **`test/metadata.test.js`** — what a search engine and a phone browser need:
  a non-empty `<title>`, a non-empty meta description, a viewport tag, a
  non-empty `lang` attribute on `<html>`, and an absolute `https` canonical
  link.
- **`test/dist-contents.test.js`** — what the build publishes, checked
  against `dist/` alone: the whole directory is listed and compared with the
  site it is expected to contain, so anything else that reaches `dist/` fails
  here until a person confirms it is site content rather than repository
  machinery. `package.json`, `package-lock.json` and this README are named
  separately, because publishing one of them is the leak the test exists to
  catch.

None of the tests make a network request. The Formspree endpoint the form
posts to is live and receives the owner's real leads, so the guard only ever
reads files.

## How to run it

```
npm ci
npm test
npm run build
```

`npm test` builds `dist/` and then runs the suite against both targets — it
fails outright if `dist/index.html` is missing, so a build that produced
nothing cannot pass unnoticed. `npm run build` copies the site into `dist/`,
byte-identical to the source; there is nothing to bundle.

The site is `index.html` and whatever static files and directories sit beside
it — everything at the repository root except the machinery the repository
runs on itself. `package.json`, `package-lock.json`, this README, the dotted
entries, and `node_modules/`, `test/`, `scripts/`, `dist/`, `.git/` and
`.github/` are withheld, so a deployed visitor cannot fetch the dependency
list or these notes at a public URL. A new static file or asset directory
dropped beside `index.html` is published without editing the build script,
and `test/dist-contents.test.js` fails until someone records that it belongs
to the site.

`dist/` is **generated, not committed** — it is listed in `.gitignore` and is
rebuilt by every `npm test` and `npm run build`, including in CI
(`.github/workflows/ci.yml`, on every push and pull request).

`package-lock.json` is committed, so `npm ci` installs against it directly.

The repository supports **Node 22 and above**, declared in `package.json` as
`engines.node`. CI derives the versions it runs from that range rather than
pinning versions of its own, and runs both of its ends: one job on the floor
exactly, one on the latest release, because `>=22` promises a visitor on a
newer Node just as much as one on 22. A final job reads back which Node each
of those jobs actually ran and fails if either end went unexercised, so the
range the repository declares and the versions the suite is genuinely run on
cannot drift apart — in either direction.

The `test` script runs `node --test 'test/**/*.test.js'`: the quoted glob
matches only the test-bearing files, so it recurses into `test/` without also
picking up its non-test helper modules as pseudo tests. Expanding that glob is
also why the floor is 22 — `node --test` does not expand it on Node 20, which
the repository used to declare while never running the suite there.

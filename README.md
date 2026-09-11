# Oakwood Junk Removal

A single hand-written `index.html` — no framework, no bundler, no runtime
JavaScript beyond what the page already has. The only thing that turns a
visitor into a lead is the Formspree-backed quote form, so this repository
carries an automated guard against the page silently breaking it.

## What the guard checks

The suite in `test/` runs the same assertions against both `index.html` and
the built `dist/index.html`, so a build step can never silently diverge from
the page a visitor actually sees:

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
nothing cannot pass unnoticed. `npm run build` copies `index.html` (and any
other static file at the repository root) into `dist/`, byte-identical to the
source; there is nothing to bundle.

`dist/` is **generated, not committed** — it is listed in `.gitignore` and is
rebuilt by every `npm test` and `npm run build`, including in CI
(`.github/workflows/ci.yml`, on every push and pull request).

`package-lock.json` is committed, so `npm ci` installs against it directly.
The `test` script runs `node --test 'test/**/*.test.js'`: the quoted glob
matches only the test-bearing files, so it recurses into `test/` without also
picking up its non-test helper modules as pseudo tests.

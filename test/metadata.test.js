// Guards what a search engine and a phone browser need from the page: a
// title, a description, a viewport tag, a declared language, and a canonical
// URL. Runs against every target getTargets() returns. Makes no network
// request — the canonical href is only checked for shape, never fetched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTargets, getMetaContent, getLinkHref } from './helpers/index.mjs';

for (const { label, root } of getTargets()) {
  test(`the page has indexable metadata (${label})`, () => {
    const title = root.querySelector('title');
    assert.ok(title, 'expected a <title> element');
    assert.notStrictEqual(title.text.trim(), '', 'expected a non-empty <title>');

    const description = getMetaContent(root, 'description');
    assert.ok(description !== null, 'expected a <meta name="description"> tag');
    assert.notStrictEqual(description.trim(), '', 'expected a non-empty meta description');

    const viewport = getMetaContent(root, 'viewport');
    assert.ok(viewport !== null, 'expected a <meta name="viewport"> tag');
    assert.notStrictEqual(viewport.trim(), '', 'expected a non-empty viewport meta tag');

    const html = root.querySelector('html');
    assert.ok(html, 'expected an <html> element');
    const lang = html.getAttribute('lang');
    assert.ok(lang !== undefined && lang !== null, 'expected a lang attribute on <html>');
    assert.notStrictEqual(lang.trim(), '', 'expected a non-empty lang attribute on <html>');

    const canonical = getLinkHref(root, 'canonical');
    assert.ok(canonical !== null, 'expected a <link rel="canonical"> tag');
    assert.notStrictEqual(canonical.trim(), '', 'expected a non-empty canonical href');

    let parsed;
    assert.doesNotThrow(() => {
      parsed = new URL(canonical);
    }, `expected the canonical href "${canonical}" to parse as an absolute URL`);
    assert.strictEqual(parsed.protocol, 'https:', 'expected the canonical href to use the https protocol');
  });
}

// Small DOM-reading helpers shared by the test-bearing units.

/**
 * Locates the single form on a parsed page. Throws if there isn't exactly
 * one, since a test relying on "the quote form" needs that to be unambiguous.
 */
export function getForm(root) {
  const forms = root.querySelectorAll('form');
  if (forms.length !== 1) {
    throw new Error(`Expected exactly one <form> on the page, found ${forms.length}.`);
  }
  return forms[0];
}

/**
 * Reads a <meta> tag's content by its name or property attribute
 * (e.g. "description", "og:title"). Returns null if no such tag exists.
 */
export function getMetaContent(root, name) {
  const el = root.querySelector(`meta[name="${name}"]`) ?? root.querySelector(`meta[property="${name}"]`);
  return el ? (el.getAttribute('content') ?? null) : null;
}

/**
 * Reads a <link> tag's href by its rel attribute (e.g. "canonical").
 * Returns null if no such tag exists.
 */
export function getLinkHref(root, rel) {
  const el = root.querySelector(`link[rel="${rel}"]`);
  return el ? (el.getAttribute('href') ?? null) : null;
}

/**
 * Compares two URLs by origin using the WHATWG URL class, rather than
 * string prefix matching, so query strings, trailing slashes and casing
 * differences never produce a false mismatch (or a false match).
 */
export function sameOrigin(urlA, urlB) {
  return new URL(urlA).origin === new URL(urlB).origin;
}

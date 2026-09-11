// Asserts the quote form's contract: the one thing on this page that turns a
// visitor into a lead. Runs against every target the harness yields (the
// hand-written source and the built copy), so a build step cannot silently
// diverge from the page a visitor actually sees. Reads files only — the
// Formspree endpoint below is live and receives the owner's real leads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTargets, getForm, getLinkHref, sameOrigin } from './helpers/index.mjs';

const REQUIRED_FIELDS = ['name', 'email', 'address', 'job'];

function hasAttribute(el, name) {
  if (typeof el.hasAttribute === 'function') return el.hasAttribute(name);
  return el.getAttribute(name) !== undefined;
}

// Explicit for/id association first, then a label the field is nested inside.
function findLabelFor(root, field) {
  const id = field.getAttribute('id');
  if (id) {
    const explicit = root.querySelector(`label[for="${id}"]`);
    if (explicit) return explicit;
  }

  let node = field.parentNode;
  while (node) {
    if (node.tagName === 'LABEL') return node;
    node = node.parentNode;
  }
  return null;
}

for (const { label, root } of getTargets()) {
  test(`${label}: page has exactly one form`, () => {
    getForm(root);
  });

  test(`${label}: form action is an absolute https URL`, () => {
    const form = getForm(root);
    const action = form.getAttribute('action');
    assert.ok(action, 'form has no action attribute');

    let url;
    assert.doesNotThrow(() => {
      url = new URL(action);
    }, `form action "${action}" must be an absolute URL`);
    assert.strictEqual(url.protocol, 'https:', `form action must be https, got "${url.protocol}"`);
  });

  test(`${label}: form method is POST`, () => {
    const form = getForm(root);
    const method = (form.getAttribute('method') ?? '').toUpperCase();
    assert.strictEqual(method, 'POST');
  });

  for (const fieldName of REQUIRED_FIELDS) {
    test(`${label}: field "${fieldName}" is required and labeled`, () => {
      const form = getForm(root);
      const field = form.querySelector(`[name="${fieldName}"]`);
      assert.ok(field, `expected a form control named "${fieldName}"`);
      assert.ok(hasAttribute(field, 'required'), `expected "${fieldName}" to carry the required attribute`);

      const fieldLabel = findLabelFor(root, field);
      assert.ok(fieldLabel, `expected "${fieldName}" to be associated with a <label>`);
      assert.notStrictEqual(
        fieldLabel.text.trim(),
        '',
        `expected the label for "${fieldName}" to have non-empty visible text`,
      );
    });
  }

  test(`${label}: _next redirects to an absolute https URL on the canonical origin`, () => {
    const form = getForm(root);
    const nextField = form.querySelector('input[name="_next"]');
    assert.ok(nextField, 'expected a hidden _next input on the form');
    assert.strictEqual(nextField.getAttribute('type'), 'hidden', '_next must be a hidden input');

    const nextValue = nextField.getAttribute('value');
    assert.ok(nextValue, '_next has no value');

    let nextUrl;
    assert.doesNotThrow(() => {
      nextUrl = new URL(nextValue);
    }, `_next value "${nextValue}" must be an absolute URL`);
    assert.strictEqual(nextUrl.protocol, 'https:', `_next must be https, got "${nextUrl.protocol}"`);

    const canonicalHref = getLinkHref(root, 'canonical');
    assert.ok(canonicalHref, 'expected a <link rel="canonical"> on the page');
    assert.ok(
      sameOrigin(nextValue, canonicalHref),
      `expected _next ("${nextValue}") to share an origin with the canonical link ("${canonicalHref}")`,
    );
  });

  test(`${label}: _next's fragment, if any, resolves to a real element`, () => {
    const form = getForm(root);
    const nextField = form.querySelector('input[name="_next"]');
    const nextValue = nextField.getAttribute('value');
    const nextUrl = new URL(nextValue);

    if (!nextUrl.hash) return;

    const fragment = nextUrl.hash.slice(1);
    const ids = new Set(root.querySelectorAll('[id]').map((el) => el.getAttribute('id')));
    assert.ok(
      ids.has(fragment),
      `_next redirects to fragment "#${fragment}" but no element on the page carries id="${fragment}"`,
    );
  });
}

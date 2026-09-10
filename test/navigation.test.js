// Guards the page's internal navigation: every '#' link must resolve to a
// real element, the page must carry exactly one <h1>, and the hero-to-form
// path must stay reachable. Runs against every target getTargets() returns,
// so both the hand-written source and the build output are held to it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTargets, getForm } from './helpers/index.mjs';

/**
 * Walks up from an element to find the nearest ancestor (or the element
 * itself) that carries an id attribute. Used to find the id of the section
 * that contains the quote form, whatever that id happens to be named.
 */
function closestId(el) {
  let node = el;
  while (node && typeof node.getAttribute === 'function') {
    const id = node.getAttribute('id');
    if (id) return id;
    node = node.parentNode;
  }
  return null;
}

for (const { label, root } of getTargets()) {
  test(`every in-page link resolves to an element (${label})`, () => {
    const ids = new Set(root.querySelectorAll('[id]').map((el) => el.getAttribute('id')));

    const hashHrefs = root
      .querySelectorAll('a[href]')
      .map((el) => el.getAttribute('href'))
      .filter((href) => href && href.startsWith('#'));

    assert.ok(hashHrefs.length > 0, 'expected at least one in-page (#) link on the page');

    for (const href of hashHrefs) {
      if (href === '#') continue;
      const fragment = href.slice(1);
      assert.ok(ids.has(fragment), `link href="${href}" has no element with id="${fragment}"`);
    }
  });

  test(`the page has exactly one <h1> (${label})`, () => {
    assert.strictEqual(root.querySelectorAll('h1').length, 1, 'expected exactly one <h1> on the page');
  });

  test(`a link points at the quote form's section (${label})`, () => {
    const quoteSectionId = closestId(getForm(root));
    assert.ok(quoteSectionId, "the quote form's containing section has no id to link to");

    const hashHrefs = root
      .querySelectorAll('a[href]')
      .map((el) => el.getAttribute('href'))
      .filter((href) => href && href.startsWith('#'));

    assert.ok(
      hashHrefs.includes(`#${quoteSectionId}`),
      `expected a link to "#${quoteSectionId}" (the quote form's section) but found none among ${JSON.stringify(hashHrefs)}`,
    );
  });
}

/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

import { getRootPath } from '@dropins/tools/lib/aem/configs.js';
import { decorateMain } from '../../scripts/scripts.js';
import {
  loadSections,
} from '../../scripts/aem.js';

const ACCOUNT_NAV_PATH = '/customer/nav';
const ACCOUNT_SIDEBAR_FRAGMENT_PATH = '/customer/sidebar-fragment';

/**
 * @param {string} path
 * @returns {string}
 */
function fragmentPathname(path) {
  if (!path) return '';
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return new URL(path).pathname;
    }
  } catch {
    /* use the authored value */
  }
  return path;
}

function isAccountNavFragment(path) {
  const clean = fragmentPathname(path).replace(/\/$/, '');
  return clean === ACCOUNT_NAV_PATH || clean.endsWith(ACCOUNT_NAV_PATH);
}

/**
 * Account pages author /customer/nav. The live list is /customer/sidebar-fragment.
 * @returns {HTMLElement}
 */
function createAccountSidebarMain() {
  const main = document.createElement('main');
  main.innerHTML = '<div><div class="commerce-account-sidebar"><div><div></div></div></div></div>';
  return main;
}

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {Promise<HTMLElement>} The root element of the fragment
 */
export async function loadFragment(path) {
  const pathname = fragmentPathname(path);
  if (isAccountNavFragment(pathname)) {
    const main = createAccountSidebarMain();
    decorateMain(main);
    await loadSections(main);
    return main;
  }

  if (pathname && pathname.startsWith('/') && !pathname.startsWith('//')) {
    const root = getRootPath().replace(/\/$/, '');
    const url = `${root}${pathname}.plain.html`;
    const isSidebar = pathname.replace(/\/$/, '') === ACCOUNT_SIDEBAR_FRAGMENT_PATH
      || pathname.endsWith(ACCOUNT_SIDEBAR_FRAGMENT_PATH);
    const resp = await fetch(url, isSidebar ? { cache: 'no-store' } : undefined);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // reset base path for media to fragment base
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(pathname, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) block.replaceChildren(...fragment.childNodes);
}

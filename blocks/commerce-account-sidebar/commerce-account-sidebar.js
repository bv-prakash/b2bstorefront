import { Icon, provider as UI } from '@dropins/tools/components.js';
import { render as accountRenderer } from '@dropins/storefront-account/render.js';
import { loadFragment } from '../fragment/fragment.js';
import { CUSTOMER_ORDERS_PATH, rootLink } from '../../scripts/commerce.js';

/**
 * Top-level list items from /customer/sidebar-fragment.
 * The fragment is a plain ol; after decorate it sits in a section wrapper.
 * @param {Element|null} fragment
 * @returns {Element[]}
 */
function readSidebarItems(fragment) {
  if (!fragment) return [];
  const list = fragment.querySelector('.default-content-wrapper > ol')
    || fragment.querySelector('ol');
  if (!list) return [];
  return [...list.children].filter((item) => item.tagName === 'LI');
}

/**
 * @param {Element|undefined} cell
 * @returns {string}
 */
function cellPath(cell) {
  if (!cell) return '';
  const anchor = cell.querySelector('a[href]');
  if (anchor) {
    try {
      return new URL(anchor.getAttribute('href'), window.location.origin).pathname;
    } catch {
      return anchor.getAttribute('href') || '';
    }
  }
  return cell.textContent.trim();
}

export default async function decorate(block) {
  const fragment = await loadFragment('/customer/sidebar-fragment');
  if (!fragment) {
    block.replaceChildren();
    return;
  }
  const sidebarItems = readSidebarItems(fragment).map((item) => {
    const itemParams = [...item.querySelectorAll(':scope > ol > li')];
    const itemTitle = item.querySelector(':scope > p')?.textContent.trim()
      || item.childNodes[0]?.textContent?.trim()
      || 'Default Title';
    const itemSubtitle = itemParams[0]?.textContent.trim() || '';
    const itemLink = cellPath(itemParams[1]) || rootLink('#');
    const itemIcon = itemParams[2]?.textContent.trim() || 'Placeholder';

    const menuItemEl = document.createElement('a');
    menuItemEl.classList.add('commerce-account-sidebar-item');
    menuItemEl.href = rootLink(itemLink);

    const isItemActive = (
      itemLink === CUSTOMER_ORDERS_PATH
        ? window.location.href.includes(CUSTOMER_ORDERS_PATH)
        : window.location.href.includes(itemLink)
    );
    if (isItemActive) {
      menuItemEl.classList.add('commerce-account-sidebar-item-active');
    }

    menuItemEl.append(
      createMenuItemIcon(itemIcon),
      createMenuItemContent(itemTitle, itemSubtitle),
      createMenuItemArrow(),
    );
    return menuItemEl;
  });

  block.replaceChildren(...sidebarItems);
}

function createMenuItemIcon(iconSource) {
  const iconEl = document.createElement('div');
  iconEl.classList.add('commerce-account-sidebar-item-icon');
  accountRenderer.render(Icon, { source: iconSource, size: 32 })(iconEl);
  return iconEl;
}

function createMenuItemContent(title, subtitle) {
  const contentEl = document.createElement('div');
  contentEl.classList.add('commerce-account-sidebar-item-content');

  const titleEl = document.createElement('p');
  titleEl.classList.add('commerce-account-sidebar-item-title');
  titleEl.innerText = title;

  const subtitleEl = document.createElement('p');
  subtitleEl.classList.add('commerce-account-sidebar-item-subtitle');
  subtitleEl.innerText = subtitle;

  contentEl.appendChild(titleEl);
  contentEl.appendChild(subtitleEl);
  return contentEl;
}

function createMenuItemArrow() {
  const arrowEl = document.createElement('div');
  arrowEl.classList.add('commerce-account-sidebar-item-arrow');
  UI.render(Icon, {
    source: 'ChevronRight',
    size: 32,
  })(arrowEl);
  return arrowEl;
}

import { render as newsletterRenderer } from '@prakash.gurung/commerce-newsletter/render.js';
import NewsletterContainer from '@prakash.gurung/commerce-newsletter/containers/NewsletterContainer.js';
import { readBlockConfig } from '../../scripts/aem.js';
import {
  checkIsAuthenticated,
  CUSTOMER_LOGIN_PATH,
  CUSTOMER_NEWSLETTER_PATH,
  rootLink,
} from '../../scripts/commerce.js';

import '../../scripts/initializers/newsletter.js';

/**
 * Reads the authored Minified view cell.
 * Omit it for the public email form.
 * true = account summary. false = account checkbox page.
 * @param {string} [value]
 * @returns {boolean|string|undefined}
 */
function resolveMinifiedView(value) {
  const cell = String(value ?? '').trim().toLowerCase();
  if (cell === 'true' || cell === 'false') return cell;
  return undefined;
}

/**
 * Authored Edit path, or this storefront's checkbox page.
 * The drop-in default is `{root}/account/newsletter`.
 * @param {string} [value]
 * @returns {string}
 */
function newsletterPagePath(value) {
  if (!value) return rootLink(CUSTOMER_NEWSLETTER_PATH);
  try {
    return rootLink(new URL(value, window.location.origin).pathname);
  } catch {
    return rootLink(value.startsWith('/') ? value : `/${value}`);
  }
}

export default async function decorate(block) {
  const {
    title,
    description,
    placeholder,
    'minified-view': minifiedViewConfig,
    'newsletter-page': newsletterPageConfig,
  } = readBlockConfig(block);

  const minified = resolveMinifiedView(minifiedViewConfig);
  let view = 'form';
  if (minified === 'true') view = 'minified';
  if (minified === 'false') view = 'options';
  block.dataset.newsletterView = view;
  block.classList.add(`commerce-newsletter--${view}`);

  if (minified !== undefined && !checkIsAuthenticated()) {
    window.location.href = rootLink(CUSTOMER_LOGIN_PATH);
    return;
  }

  const props = {
    title: title || undefined,
    description: description || undefined,
    placeholder: placeholder || undefined,
  };

  if (minified !== undefined) {
    props.minified = minified;
    props.newsletterUrl = newsletterPagePath(newsletterPageConfig);
  }

  await newsletterRenderer.render(NewsletterContainer, props)(block);
}

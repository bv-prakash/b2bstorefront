import { render as newsletterRenderer } from '@prakash.gurung/commerce-newsletter/render.js';
import NewsletterContainer from '@prakash.gurung/commerce-newsletter/containers/NewsletterContainer.js';
import { readBlockConfig } from '../../scripts/aem.js';

import '../../scripts/initializers/newsletter.js';

export default async function decorate(block) {
  const { title, description, placeholder } = readBlockConfig(block);

  await newsletterRenderer.render(NewsletterContainer, {
    title: title || undefined,
    description: description || undefined,
    placeholder: placeholder || undefined,
  })(block);
}

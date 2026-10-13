import { initializers } from '@dropins/tools/initializer.js';
import { initialize, setEndpoint } from '@prakash.gurung/commerce-newsletter/api.js';
import { initializeDropin } from './index.js';
import { CORE_FETCH_GRAPHQL, fetchPlaceholders } from '../commerce.js';

await initializeDropin(async () => {
  // Share the storefront GraphQL client so store and auth headers are included.
  setEndpoint(CORE_FETCH_GRAPHQL);

  const labels = await fetchPlaceholders('placeholders/newsletter.json').catch(() => ({}));
  const langDefinitions = {
    default: {
      ...labels,
    },
  };

  return initializers.mountImmediately(initialize, {
    langDefinitions,
    placeholderSheet: '/placeholders/newsletter.json',
  });
})();

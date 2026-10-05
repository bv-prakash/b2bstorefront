import { initializers } from '@dropins/tools/initializer.js';
import { initialize, setEndpoint } from '@prakash.gurung/commerce-newsletter/api.js';
import { initializeDropin } from './index.js';
import { CORE_FETCH_GRAPHQL } from '../commerce.js';

await initializeDropin(async () => {
  // Share the storefront GraphQL client so store and auth headers are included.
  setEndpoint(CORE_FETCH_GRAPHQL);

  return initializers.mountImmediately(initialize, {});
})();

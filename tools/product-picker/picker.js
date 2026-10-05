const SEARCH_QUERY = `query ProductPicker($phrase: String!, $currentPage: Int!) {
  productSearch(phrase: $phrase, current_page: $currentPage, page_size: 20) {
    total_count
    items {
      productView {
        sku
        name
      }
    }
    page_info {
      current_page
      total_pages
    }
  }
}`;

const statusEl = document.getElementById('picker-status');
const listEl = document.getElementById('product-list');
const searchEl = document.getElementById('product-search');

let commerce = null;
let page = 1;
let phrase = '';
let totalPages = 1;
let daActions = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function connectAuthoring() {
  try {
    // eslint-disable-next-line import/no-unresolved
    const sdk = await import('https://da.live/nx/utils/sdk.js');
    const da = await sdk.default;
    daActions = da.actions;
  } catch (error) {
    console.error('Document Authoring is unavailable', error);
  }
}

async function loadCommerceConfig() {
  const response = await fetch('/config.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch /config.json: ${response.status}`);
  }
  const config = await response.json();
  const store = config?.public?.default;
  if (!store?.['commerce-endpoint']) {
    throw new Error('config.json is missing public.default.commerce-endpoint');
  }
  return store;
}

async function fetchProducts(nextPage, nextPhrase) {
  const headers = {
    'Content-Type': 'application/json',
    ...(commerce.headers?.cs || {}),
  };
  const storeHeader = commerce.headers?.all?.Store;
  if (storeHeader) headers.Store = storeHeader;

  const response = await fetch(commerce['commerce-endpoint'], {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { phrase: nextPhrase, currentPage: nextPage },
    }),
  });
  if (!response.ok) {
    throw new Error(`Product search failed: ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }
  return payload.data?.productSearch;
}

function renderProducts(products, append) {
  const markup = products.map((product) => `
    <li>
      <button type="button" data-sku="${escapeHtml(product.sku)}">
        <span class="product-name">${escapeHtml(product.name || product.sku)}</span>
        <span class="product-sku">SKU: ${escapeHtml(product.sku)}</span>
      </button>
    </li>
  `).join('');

  if (append) listEl.insertAdjacentHTML('beforeend', markup);
  else listEl.innerHTML = markup;

  const existingMore = document.getElementById('load-more');
  existingMore?.remove();
  if (page < totalPages) {
    const more = document.createElement('button');
    more.id = 'load-more';
    more.type = 'button';
    more.className = 'picker-more';
    more.textContent = 'Load more';
    more.addEventListener('click', () => {
      page += 1;
      loadPage(true);
    });
    listEl.after(more);
  }
}

async function insertSku(sku) {
  if (daActions) {
    daActions.sendText(sku);
    daActions.closeLibrary();
    return;
  }
  try {
    await navigator.clipboard.writeText(sku);
    setStatus(`Copied SKU ${sku}. Open this picker from the library to insert it into the sheet.`);
  } catch (error) {
    console.error(error);
    setStatus(`Selected SKU ${sku}`);
  }
}

async function loadPage(append) {
  setStatus('Loading products…');
  const result = await fetchProducts(page, phrase);
  const products = (result?.items || [])
    .map((item) => item.productView)
    .filter((product) => product?.sku);
  totalPages = result?.page_info?.total_pages || 1;
  renderProducts(products, append);
  const count = result?.total_count ?? products.length;
  setStatus(count ? `${count} products. Select one to insert its SKU.` : 'No products found.');
}

listEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-sku]');
  if (!button) return;
  insertSku(button.dataset.sku);
});

let searchTimer;
searchEl.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    phrase = searchEl.value.trim();
    page = 1;
    loadPage(false).catch((error) => {
      console.error(error);
      setStatus(error.message);
    });
  }, 300);
});

connectAuthoring();

loadCommerceConfig()
  .then((store) => {
    commerce = store;
    return loadPage(false);
  })
  .catch((error) => {
    console.error(error);
    setStatus(error.message);
  });

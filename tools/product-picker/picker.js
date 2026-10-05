const PAGE_SIZE = 50;
const MAX_PAGES = 20;

const CATEGORIES_QUERY = `query PickerCategories($id: String!) {
  categories(ids: [$id], subtree: { depth: 4, startLevel: 1 }) {
    id
    name
    level
  }
}`;

const PRODUCTS_QUERY = `query ProductPicker($phrase: String!, $currentPage: Int!, $pageSize: Int!) {
  productSearch(phrase: $phrase, current_page: $currentPage, page_size: $pageSize) {
    total_count
    items { productView { sku name } }
    page_info { current_page total_pages }
  }
}`;

const CATEGORY_PRODUCTS_QUERY = `query ProductPickerByCategory(
  $phrase: String!,
  $currentPage: Int!,
  $pageSize: Int!,
  $categoryId: String!
) {
  productSearch(
    phrase: $phrase,
    filter: [{ attribute: "categoryIds", eq: $categoryId }],
    current_page: $currentPage,
    page_size: $pageSize
  ) {
    total_count
    items { productView { sku name } }
    page_info { current_page total_pages }
  }
}`;

const statusEl = document.getElementById('picker-status');
const listEl = document.getElementById('product-list');
const searchEl = document.getElementById('product-search');
const categoryEl = document.getElementById('category-filter');

let commerce = null;
let phrase = '';
let categoryId = '';
let daActions = null;
let requestId = 0;

function setStatus(message) {
  statusEl.textContent = message;
}

function escapeHtml(value) {
  return String(value)
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

function requestHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    ...(commerce.headers?.cs || {}),
  };
  const storeHeader = commerce.headers?.all?.Store;
  if (storeHeader) headers.Store = storeHeader;
  return headers;
}

async function graphql(query, variables) {
  const response = await fetch(commerce['commerce-endpoint'], {
    method: 'POST',
    headers: requestHeaders(),
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`Catalog request failed: ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message);
  }
  return payload.data;
}

async function loadCategories() {
  const rootId = commerce.plugins?.picker?.rootCategory || '2';
  try {
    const data = await graphql(CATEGORIES_QUERY, { id: String(rootId) });
    const categories = (data?.categories || [])
      .filter((category) => category?.id && category?.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.id;
      const indent = Math.max(0, (category.level || 1) - 1);
      option.textContent = `${'· '.repeat(indent)}${category.name}`;
      categoryEl.append(option);
    });
  } catch (error) {
    console.error(error);
    setStatus('Categories could not be loaded. All products is still available.');
  }
}

async function fetchProductPage(currentPage) {
  const variables = {
    phrase,
    currentPage,
    pageSize: PAGE_SIZE,
  };
  const data = categoryId
    ? await graphql(CATEGORY_PRODUCTS_QUERY, { ...variables, categoryId })
    : await graphql(PRODUCTS_QUERY, variables);
  return data?.productSearch;
}

async function fetchAllProducts() {
  const products = [];
  let currentPage = 1;
  let totalPages = 1;
  let totalCount = 0;

  while (currentPage <= totalPages && currentPage <= MAX_PAGES) {
    // eslint-disable-next-line no-await-in-loop
    const result = await fetchProductPage(currentPage);
    const pageProducts = (result?.items || [])
      .map((item) => item.productView)
      .filter((product) => product?.sku);
    products.push(...pageProducts);
    totalPages = result?.page_info?.total_pages || 1;
    totalCount = result?.total_count ?? products.length;
    currentPage += 1;
  }

  return { products, totalCount };
}

function renderProducts(products) {
  if (!products.length) {
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = products.map((product) => `
    <li>
      <button type="button" data-sku="${escapeHtml(product.sku)}">
        <span class="product-name">${escapeHtml(product.name || product.sku)}</span>
        <span class="product-sku">SKU: ${escapeHtml(product.sku)}</span>
      </button>
    </li>
  `).join('');
}

function productBlockHtml(sku) {
  const safeSku = escapeHtml(sku);
  return `
    <div class="product-details">
      <div>
        <div><p>defaultSku</p></div>
        <div><p>${safeSku}</p></div>
      </div>
    </div>
    <div class="metadata">
      <div>
        <div><p>sku</p></div>
        <div><p>${safeSku}</p></div>
      </div>
    </div>
  `;
}

async function insertSku(sku) {
  if (daActions) {
    daActions.sendHTML(productBlockHtml(sku));
    daActions.closeLibrary();
    return;
  }
  try {
    await navigator.clipboard.writeText(sku);
    setStatus(`Copied SKU ${sku}. Open this picker from the library to insert the product details block.`);
  } catch (error) {
    console.error(error);
    setStatus(`Selected SKU ${sku}`);
  }
}

async function loadProducts() {
  const currentRequest = requestId + 1;
  requestId = currentRequest;
  setStatus(categoryId ? 'Loading products in this category…' : 'Loading all products…');
  const { products, totalCount } = await fetchAllProducts();
  if (currentRequest !== requestId) return;
  renderProducts(products);
  const scope = categoryId ? 'in this category' : 'in the store';
  setStatus(totalCount
    ? `${products.length} of ${totalCount} products ${scope}. Select one to add its product details to the document.`
    : `No products found ${scope}.`);
}

listEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-sku]');
  if (!button) return;
  insertSku(button.dataset.sku);
});

categoryEl.addEventListener('change', () => {
  categoryId = categoryEl.value;
  loadProducts().catch((error) => {
    console.error(error);
    setStatus(error.message);
  });
});

let searchTimer;
searchEl.addEventListener('input', () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    phrase = searchEl.value.trim();
    loadProducts().catch((error) => {
      console.error(error);
      setStatus(error.message);
    });
  }, 300);
});

connectAuthoring();

loadCommerceConfig()
  .then(async (store) => {
    commerce = store;
    await loadCategories();
    await loadProducts();
  })
  .catch((error) => {
    console.error(error);
    setStatus(error.message);
  });

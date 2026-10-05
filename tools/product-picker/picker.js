const PAGE_SIZE = 50;
const MAX_PAGES = 20;

const CATEGORIES_QUERY = `query PickerCategories($id: String!) {
  categories(ids: [$id], subtree: { depth: 4, startLevel: 1 }) {
    id
    name
    parentId
    path
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
const categoryPathEl = document.getElementById('category-path');

let commerce = null;
let phrase = '';
let categoryId = '';
let categoryPath = 'All products';
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

function sortBranches(nodes) {
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  nodes.forEach((node) => sortBranches(node.children));
}

function buildCategoryTree(categories, rootId) {
  const nodes = new Map();
  categories.forEach((category) => {
    nodes.set(String(category.id), {
      id: String(category.id),
      name: category.name.trim(),
      parentId: String(category.parentId || ''),
      children: [],
    });
  });

  nodes.forEach((node) => {
    const parent = nodes.get(node.parentId);
    if (parent && node.id !== rootId) parent.children.push(node);
  });

  const root = nodes.get(rootId);
  const branches = root ? root.children : [...nodes.values()].filter((node) => node.id !== rootId);
  sortBranches(branches);
  return branches;
}

function categoryBranchHtml(nodes, parentPath) {
  if (!nodes.length) return '';
  return `<ul>${nodes.map((node) => {
    const trail = parentPath ? `${parentPath} / ${node.name}` : node.name;
    const childMarkup = categoryBranchHtml(node.children, trail);
    return `<li class="${node.children.length ? 'has-children' : 'is-leaf'}">
      <button type="button" data-category="${escapeHtml(node.id)}" data-path="${escapeHtml(trail)}" aria-pressed="false">
        <span class="category-name">${escapeHtml(node.name)}</span>
        ${parentPath ? `<span class="category-under">${escapeHtml(parentPath)}</span>` : ''}
      </button>
      ${childMarkup}
    </li>`;
  }).join('')}</ul>`;
}

function renderCategoryTree(categories, rootId) {
  const branches = buildCategoryTree(categories, rootId);
  categoryEl.innerHTML = `<ul class="category-roots">
    <li class="is-leaf">
      <button type="button" data-category="" data-path="All products" aria-pressed="true">
        <span class="category-name">All products</span>
      </button>
    </li>
  </ul>${categoryBranchHtml(branches, '')}`;
}

async function loadCategories() {
  const rootId = String(commerce.plugins?.picker?.rootCategory || '2');
  try {
    const data = await graphql(CATEGORIES_QUERY, { id: rootId });
    const categories = (data?.categories || [])
      .filter((category) => category?.id && category?.name);
    renderCategoryTree(categories, rootId);
  } catch (error) {
    console.error(error);
    categoryEl.innerHTML = `<ul class="category-roots"><li>
      <button type="button" data-category="" data-path="All products" aria-pressed="true">
        <span class="category-name">All products</span>
      </button>
    </li></ul>`;
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
  // Document Authoring stores blocks as tables. The first row is the block name,
  // which becomes class="product-details" on the published page.
  return `<table><tbody><tr><td colspan="2">product-details</td></tr><tr><td><p>selectSku</p></td><td><p>${safeSku}</p></td></tr><tr><td><p>Grid Ordering Enabled</p></td><td><p>true</p></td></tr></tbody></table>`;
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
  setStatus(categoryId ? `Loading products in ${categoryPath}…` : 'Loading all products…');
  const { products, totalCount } = await fetchAllProducts();
  if (currentRequest !== requestId) return;
  renderProducts(products);
  const scope = categoryId ? `in ${categoryPath}` : 'in the store';
  setStatus(totalCount
    ? `${products.length} of ${totalCount} products ${scope}. Select one to add its product details to the document.`
    : `No products found ${scope}.`);
}

listEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-sku]');
  if (!button) return;
  insertSku(button.dataset.sku);
});

document.querySelector('.picker-search').addEventListener('submit', (event) => {
  event.preventDefault();
});

categoryEl.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-category]');
  if (!button) return;
  categoryId = button.dataset.category;
  categoryPath = button.dataset.path || 'All products';
  categoryPathEl.textContent = categoryPath;
  categoryEl.querySelectorAll('button[aria-pressed="true"]').forEach((selected) => {
    selected.setAttribute('aria-pressed', 'false');
  });
  button.setAttribute('aria-pressed', 'true');
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

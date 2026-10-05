const PAGE_SIZE = 50;
const MAX_PAGES = 20;

const CATEGORIES_QUERY = `query PickerCategories($id: String!) {
  categories(ids: [$id], subtree: { depth: 4, startLevel: 1 }) {
    id
    name
    parentId
    position
  }
}`;

const CATEGORY_COUNTS_QUERY = `query CategoryCounts {
  productSearch(phrase: "", current_page: 1, page_size: 1) {
    total_count
    facets {
      attribute
      buckets {
        ... on CategoryBucket {
          id
          count
        }
      }
    }
  }
}`;

const FOLDER_ICON = '<svg class="category-folder" viewBox="0 0 16 14" aria-hidden="true"><path fill="#e2b007" d="M1 2.5h5.2l1.3 1.6H15V12H1z"/><path fill="#f6d56a" d="M1 5.2h14V12H1z"/></svg>';

const PRODUCTS_QUERY = `query ProductPicker($phrase: String!, $currentPage: Int!, $pageSize: Int!) {
  productSearch(phrase: $phrase, current_page: $currentPage, page_size: $pageSize) {
    total_count
    items { productView { sku name images { url roles } } }
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
    items { productView { sku name images { url roles } } }
    page_info { current_page total_pages }
  }
}`;

const listEl = document.getElementById('product-list');
const searchEl = document.getElementById('product-search');
const categoryEl = document.getElementById('category-filter');

let commerce = null;
let phrase = '';
let categoryId = '';
let requestId = 0;
let isSelected = () => false;
let onSelect = () => {};

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export const UE_EXTENSION_ID = 'b2bstorefront-product-picker';

export function isUniversalEditorPicker() {
  return new URLSearchParams(window.location.search).get('editor') === 'ue';
}

export function connectAuthoring() {
  if (isUniversalEditorPicker()) return Promise.resolve(null);
  // eslint-disable-next-line import/no-unresolved
  return import('https://da.live/nx/utils/sdk.js')
    .then(async (sdk) => {
      const da = await sdk.default;
      return da.actions;
    })
    .catch((error) => {
      console.error('Document Authoring is unavailable', error);
      return null;
    });
}

export function connectUniversalEditor() {
  if (!isUniversalEditorPicker()) return Promise.resolve(null);
  // eslint-disable-next-line import/no-unresolved, import/extensions
  return import('https://esm.sh/@adobe/uix-guest@1.1.11/es2022/uix-guest.mjs')
    .then(async (guest) => {
      const attach = guest.attach || guest.default?.attach;
      const connection = await attach({ id: UE_EXTENSION_ID });
      if (connection?.host?.field?.setHeight) await connection.host.field.setHeight(720);
      return connection;
    })
    .catch((error) => {
      console.error('Universal Editor is unavailable', error);
      return null;
    });
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
  nodes.sort((a, b) => (a.position - b.position) || a.name.localeCompare(b.name));
  nodes.forEach((node) => sortBranches(node.children));
}

function buildCategoryTree(categories, rootId, counts, totalCount) {
  const nodes = new Map();
  categories.forEach((category) => {
    const id = String(category.id);
    const foundCount = counts.get(id) ?? (id === rootId ? totalCount : null);
    nodes.set(id, {
      id,
      name: category.name.trim(),
      parentId: String(category.parentId || ''),
      position: category.position ?? 0,
      count: Number.isInteger(foundCount) ? foundCount : null,
      children: [],
    });
  });

  nodes.forEach((node) => {
    const parent = nodes.get(node.parentId);
    if (parent && node.id !== rootId) parent.children.push(node);
  });

  nodes.forEach((node) => sortBranches(node.children));
  return nodes.get(rootId) || null;
}

function categoryNodeHtml(node, parentPath, level) {
  const trail = parentPath ? `${parentPath} / ${node.name}` : node.name;
  const count = node.count === null ? '' : `<span class="category-count">(${node.count})</span>`;
  const hasChildren = node.children.length > 0;
  const open = level === 0;
  const children = hasChildren
    ? `<ul>${node.children.map((child) => categoryNodeHtml(child, trail, level + 1)).join('')}</ul>`
    : '';
  const toggle = hasChildren
    ? `<button type="button" class="category-toggle" aria-expanded="${open}" aria-label="${open ? 'Collapse' : 'Expand'} ${escapeHtml(node.name)}"></button>`
    : '<span class="category-toggle-spacer" aria-hidden="true"></span>';
  // The root category is the whole catalog. Filtering by its id returns no products.
  const categoryValue = level === 0 ? '' : node.id;

  return `<li class="category-node${hasChildren ? ' has-children' : ' is-leaf'}${open ? ' is-open' : ''}" data-level="${level}">
    <div class="category-row">
      ${toggle}
      <button type="button" class="category-select" data-category="${escapeHtml(categoryValue)}" data-path="${escapeHtml(trail)}" aria-pressed="${level === 0 ? 'true' : 'false'}">
        ${FOLDER_ICON}
        <span class="category-name">${escapeHtml(node.name)}</span>
        ${count}
      </button>
    </div>
    ${children}
  </li>`;
}

function renderCategoryTree(root) {
  categoryEl.innerHTML = root
    ? `<ul class="category-branches">${categoryNodeHtml(root, '', 0)}</ul>`
    : '';
}

function setTreeOpen(open) {
  categoryEl.querySelectorAll('.has-children').forEach((node) => {
    node.classList.toggle('is-open', open);
    const toggle = node.querySelector(':scope > .category-row .category-toggle');
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(open));
    const name = node.querySelector(':scope > .category-row .category-name')?.textContent || 'category';
    toggle.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${name}`);
  });
}

async function loadCategoryCounts() {
  try {
    const data = await graphql(CATEGORY_COUNTS_QUERY, {});
    const search = data?.productSearch;
    const facet = (search?.facets || []).find((item) => item.attribute === 'categories');
    const counts = new Map();
    (facet?.buckets || []).forEach((bucket) => {
      if (bucket?.id != null && Number.isInteger(bucket.count)) {
        counts.set(String(bucket.id), bucket.count);
      }
    });
    return {
      counts,
      totalCount: Number.isInteger(search?.total_count) ? search.total_count : null,
    };
  } catch (error) {
    console.error(error);
    return { counts: new Map(), totalCount: null };
  }
}

async function loadCategories() {
  const rootId = String(commerce.plugins?.picker?.rootCategory || '2');
  try {
    const [data, countResult] = await Promise.all([
      graphql(CATEGORIES_QUERY, { id: rootId }),
      loadCategoryCounts(),
    ]);
    const categories = (data?.categories || [])
      .filter((category) => category?.id && category?.name);
    const root = buildCategoryTree(
      categories,
      rootId,
      countResult.counts,
      countResult.totalCount,
    );
    renderCategoryTree(root);
  } catch (error) {
    console.error(error);
    renderCategoryTree(null);
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

  while (currentPage <= totalPages && currentPage <= MAX_PAGES) {
    // eslint-disable-next-line no-await-in-loop
    const result = await fetchProductPage(currentPage);
    const pageProducts = (result?.items || [])
      .map((item) => item.productView)
      .filter((product) => product?.sku);
    products.push(...pageProducts);
    totalPages = result?.page_info?.total_pages || 1;
    currentPage += 1;
  }

  return products;
}

function productImageUrl(product) {
  const images = product.images || [];
  const preferred = images.find((image) => image.roles?.includes('small_image'))
    || images.find((image) => image.roles?.includes('thumbnail'))
    || images[0];
  return preferred?.url || '';
}

function showListError(error) {
  console.error(error);
  listEl.innerHTML = `<li class="product-empty">${escapeHtml(error.message)}</li>`;
}

function renderProducts(products) {
  if (!products.length) {
    listEl.innerHTML = '<li class="product-empty">No products.</li>';
    return;
  }

  listEl.innerHTML = products.map((product) => {
    const imageUrl = productImageUrl(product);
    const thumb = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="">`
      : '';
    const pressed = isSelected(product.sku);
    return `<li>
      <button type="button" data-sku="${escapeHtml(product.sku)}" data-name="${escapeHtml(product.name || product.sku)}" aria-pressed="${pressed ? 'true' : 'false'}">
        <span class="product-thumb">${thumb}</span>
        <span class="product-copy">
          <span class="product-name">${escapeHtml(product.name || product.sku)}</span>
          <span class="product-sku">${escapeHtml(product.sku)}</span>
        </span>
      </button>
    </li>`;
  }).join('');
}

async function loadProducts() {
  const currentRequest = requestId + 1;
  requestId = currentRequest;
  const products = await fetchAllProducts();
  if (currentRequest !== requestId) return;
  renderProducts(products);
}

/**
 * Opens the category tree and product list shared by the picker pages.
 * @param {object} options
 * @param {(product: {sku: string, name: string}) => void} options.onSelect
 * @param {(sku: string) => boolean} [options.isSelected]
 * @param {(store: object) => void} [options.onReady]
 */
export function mountCatalog(options) {
  onSelect = options.onSelect;
  isSelected = options.isSelected || (() => false);

  listEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-sku]');
    if (!button) return;
    onSelect({ sku: button.dataset.sku, name: button.dataset.name || button.dataset.sku });
  });

  document.querySelector('.picker-search').addEventListener('submit', (event) => {
    event.preventDefault();
  });

  document.getElementById('category-collapse').addEventListener('click', () => setTreeOpen(false));
  document.getElementById('category-expand').addEventListener('click', () => setTreeOpen(true));

  categoryEl.addEventListener('click', (event) => {
    const toggle = event.target.closest('button.category-toggle');
    if (toggle) {
      const node = toggle.closest('.has-children');
      if (!node) return;
      const open = !node.classList.contains('is-open');
      node.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      const name = node.querySelector(':scope > .category-row .category-name')?.textContent || 'category';
      toggle.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${name}`);
      return;
    }

    const button = event.target.closest('button[data-category]');
    if (!button) return;
    categoryId = button.dataset.category || '';
    categoryEl.querySelectorAll('button[aria-pressed="true"]').forEach((selected) => {
      selected.setAttribute('aria-pressed', 'false');
    });
    button.setAttribute('aria-pressed', 'true');
    loadProducts().catch(showListError);
  });

  let searchTimer;
  searchEl.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      phrase = searchEl.value.trim();
      loadProducts().catch(showListError);
    }, 300);
  });

  loadCommerceConfig()
    .then(async (store) => {
      commerce = store;
      if (options.onReady) options.onReady(store);
      await loadCategories();
      await loadProducts();
    })
    .catch((error) => {
      console.error(error);
      showListError(error);
    });
}

import { CS_FETCH_GRAPHQL, fetchPlaceholders, getProductLink } from '../../scripts/commerce.js';
import { PRODUCT_SLIDER_DEFAULTS } from './defaults.js';

const PRODUCTS_QUERY = `query ProductSlider($skus: [String!], $pageSize: Int!) {
  productSearch(
    phrase: ""
    filter: [{ attribute: "sku", in: $skus }]
    current_page: 1
    page_size: $pageSize
  ) {
    items {
      productView {
        __typename
        sku
        name
        urlKey
        inStock
        images { url roles }
        ... on SimpleProductView {
          price {
            final { amount { value currency } }
            regular { amount { value currency } }
          }
        }
        ... on ComplexProductView {
          priceRange {
            minimum {
              final { amount { value currency } }
              regular { amount { value currency } }
            }
            maximum {
              final { amount { value currency } }
              regular { amount { value currency } }
            }
          }
        }
      }
    }
  }
}`;

const CONFIG_KEYS = new Set(['layout', 'mobile', 'tablet', 'desktop', 'skus', 'products']);

function parseSkuList(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === 'string') return { sku: item.trim(), name: '' };
          if (item?.sku) return { sku: String(item.sku).trim(), name: item.name || '' };
          return null;
        }).filter((item) => item?.sku);
      }
    } catch (error) {
      console.error(error);
    }
  }
  return trimmed.split(/[\s,]+/)
    .map((sku) => sku.trim())
    .filter(Boolean)
    .map((sku) => ({ sku, name: '' }));
}

function positiveCount(value, fallback) {
  const count = Number.parseInt(value, 10);
  return Number.isInteger(count) && count > 0 ? count : fallback;
}

function sliderDefaults() {
  return {
    layout: PRODUCT_SLIDER_DEFAULTS.layout === 'grid' ? 'grid' : 'slider',
    mobile: positiveCount(PRODUCT_SLIDER_DEFAULTS.mobile, 1),
    tablet: positiveCount(PRODUCT_SLIDER_DEFAULTS.tablet, 2),
    desktop: positiveCount(PRODUCT_SLIDER_DEFAULTS.desktop, 4),
  };
}

function readSliderConfig(block) {
  const config = { ...sliderDefaults(), products: [] };
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const label = cells[0].textContent.trim();
    const value = cells[1].textContent.trim();
    const key = label.toLowerCase();
    if (key === 'layout') {
      config.layout = value.toLowerCase() === 'grid' ? 'grid' : 'slider';
    } else if (key === 'mobile' || key === 'tablet' || key === 'desktop') {
      config[key] = positiveCount(value, config[key]);
    } else if (key === 'skus' || key === 'products') {
      config.products.push(...parseSkuList(value));
    } else if (key === 'sku' && value) {
      config.products.push({ sku: value, name: '' });
    } else if (label && !CONFIG_KEYS.has(key)) {
      config.products.push({ sku: label, name: value });
    }
  });

  const seen = new Set();
  config.products = config.products.filter((product) => {
    if (!product.sku || seen.has(product.sku)) return false;
    seen.add(product.sku);
    return true;
  });
  return config;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function productImage(product) {
  const images = product.images || [];
  const preferred = images.find((image) => image.roles?.includes('small_image'))
    || images.find((image) => image.roles?.includes('thumbnail'))
    || images[0];
  return preferred?.url || '';
}

function cardImageWidth() {
  return 400;
}

function optimizedImageUrl(url, width) {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('format', 'webp');
    parsed.searchParams.set('quality', '80');
    return parsed.toString();
  } catch {
    return url;
  }
}

function preloadLcpImage(href) {
  if (!href) return;
  const exists = [...document.querySelectorAll('link[rel="preload"][as="image"]')]
    .some((link) => link.href === href);
  if (exists) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = href;
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
}

function whenIdle(fn) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => fn(), { timeout: 2500 });
    return;
  }
  window.setTimeout(fn, 1);
}

function priceCurrency(amount) {
  const currency = amount?.currency || 'USD';
  return Intl.supportedValuesOf('currency').includes(currency) ? currency : 'USD';
}

function formatPriceText(product) {
  const isComplex = product.__typename === 'ComplexProductView';
  if (isComplex) {
    const min = product.priceRange?.minimum?.final?.amount?.value
      ?? product.priceRange?.minimum?.regular?.amount?.value;
    const max = product.priceRange?.maximum?.final?.amount?.value
      ?? product.priceRange?.maximum?.regular?.amount?.value;
    const currency = priceCurrency(
      product.priceRange?.minimum?.final?.amount
      || product.priceRange?.minimum?.regular?.amount,
    );
    if (min === undefined) return '';
    const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    if (max !== undefined && max !== min) return `${nf.format(min)} – ${nf.format(max)}`;
    return nf.format(min);
  }
  const amount = product.price?.final?.amount?.value ?? product.price?.regular?.amount?.value;
  const currency = priceCurrency(product.price?.final?.amount || product.price?.regular?.amount);
  if (amount === undefined) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function visibleCount(config) {
  if (window.matchMedia('(min-width: 1200px)').matches) return config.desktop;
  if (window.matchMedia('(min-width: 600px)').matches) return config.tablet;
  return config.mobile;
}

function skeletonCard(product) {
  const name = product.name || product.sku;
  return `<article class="product-slider-card product-slider-card--pending" data-sku="${escapeHtml(product.sku)}">
    <div class="product-slider-card-media" aria-hidden="true"></div>
    <div class="product-slider-card-body">
      <p class="product-slider-card-name">${escapeHtml(name)}</p>
    </div>
  </article>`;
}

function renderSliderShell(block, cardsHtml) {
  block.innerHTML = `<div class="product-slider-controls">
      <button type="button" class="product-slider-prev" aria-label="Previous products">Previous</button>
      <button type="button" class="product-slider-next" aria-label="Next products">Next</button>
    </div>
    <div class="product-slider-track">${cardsHtml}</div>
    <div class="product-slider-compare" hidden></div>`;
}

function cardHtml(product, { eager = false, width = 400 } = {}) {
  const href = getProductLink(product.urlKey, product.sku);
  const name = product.name || product.sku;
  const image = productImage(product);
  const src = optimizedImageUrl(image, width);
  const srcSmall = optimizedImageUrl(image, 360);
  const loading = eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
  const media = src
    ? `<img src="${escapeHtml(src)}" srcset="${escapeHtml(srcSmall)} 360w, ${escapeHtml(src)} 400w" sizes="(min-width: 1200px) 280px, (min-width: 600px) 45vw, 92vw" width="400" height="300" alt="${escapeHtml(name)}"${loading}>`
    : '';
  const price = formatPriceText(product);
  return `<article class="product-slider-card" data-sku="${escapeHtml(product.sku)}">
    <a class="product-slider-card-media" href="${escapeHtml(href)}">${media}</a>
    <div class="product-slider-card-body">
      <a class="product-slider-card-name" href="${escapeHtml(href)}">${escapeHtml(name)}</a>
      <p class="product-slider-card-price">${escapeHtml(price)}</p>
      <div class="product-slider-card-actions">
        <div class="product-slider-card-cart"></div>
        <div class="product-slider-card-wishlist"></div>
        <button type="button" class="product-slider-card-compare" aria-pressed="false">Compare</button>
      </div>
    </div>
  </article>`;
}

function renderCompare(panel, compared, block) {
  if (compared.size < 2) {
    panel.hidden = true;
    panel.replaceChildren();
    return;
  }
  panel.hidden = false;
  panel.innerHTML = `<p class="product-slider-compare-title">Compare</p>
    <ul>${[...compared.values()].map((product) => {
    const image = optimizedImageUrl(productImage(product), 120);
    const thumb = image ? `<img src="${escapeHtml(image)}" width="120" height="120" alt="" loading="lazy">` : '';
    const price = block.querySelector(`.product-slider-card[data-sku="${CSS.escape(product.sku)}"] .product-slider-card-price`)?.innerHTML || '';
    return `<li>
      ${thumb}
      <span>${escapeHtml(product.name || product.sku)}</span>
      <div class="product-slider-card-price">${price}</div>
    </li>`;
  }).join('')}</ul>`;
}

function isFirstSectionBlock(block) {
  const section = block.closest('.section');
  return Boolean(section && section === section.parentElement?.querySelector(':scope > .section'));
}

async function hydrateSliderCards(block, products, compared) {
  const [
    { Button, Icon, provider: UI },
    cartApi,
    { WishlistToggle },
    { render: wishlistRender },
    labels,
  ] = await Promise.all([
    import('@dropins/tools/components.js'),
    import('@dropins/storefront-cart/api.js'),
    import('@dropins/storefront-wishlist/containers/WishlistToggle.js'),
    import('@dropins/storefront-wishlist/render.js'),
    fetchPlaceholders(),
    import('../../scripts/initializers/cart.js'),
    import('../../scripts/initializers/wishlist.js'),
  ]);

  const track = block.querySelector('.product-slider-track');
  const comparePanel = block.querySelector('.product-slider-compare');
  const cards = [...track.querySelectorAll('.product-slider-card')];

  await Promise.all(products.map(async (product, index) => {
    const card = cards[index];
    if (!card) return;
    const name = product.name || product.sku;
    const cartSlot = card.querySelector('.product-slider-card-cart');
    const addToCartLabel = `${labels.Global?.AddProductToCart || 'Add to cart'} ${name}`;
    const needsOptions = product.__typename === 'ComplexProductView';
    await UI.render(Button, {
      'aria-label': addToCartLabel,
      children: labels.Global?.AddProductToCart || 'Add to cart',
      icon: Icon({ source: 'Cart' }),
      variant: 'primary',
      disabled: !needsOptions && product.inStock === false,
      href: needsOptions ? getProductLink(product.urlKey, product.sku) : undefined,
      onClick: needsOptions ? undefined : () => cartApi.addProductsToCart([{
        sku: product.sku,
        quantity: 1,
      }]),
    })(cartSlot);
    await wishlistRender.render(WishlistToggle, {
      product,
      variant: 'tertiary',
    })(card.querySelector('.product-slider-card-wishlist'));

    card.querySelector('.product-slider-card-compare').addEventListener('click', () => {
      const button = card.querySelector('.product-slider-card-compare');
      const selected = !compared.has(product.sku);
      if (selected) compared.set(product.sku, product);
      else compared.delete(product.sku);
      button.setAttribute('aria-pressed', String(selected));
      card.classList.toggle('is-compared', selected);
      renderCompare(comparePanel, compared, block);
    });
  }));
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readSliderConfig(block);
  const compared = new Map();

  if (!config.products.length) {
    block.textContent = '';
    return;
  }

  block.style.setProperty('--product-slider-mobile', config.mobile);
  block.style.setProperty('--product-slider-tablet', config.tablet);
  block.style.setProperty('--product-slider-desktop', config.desktop);
  block.classList.toggle('product-slider--grid', config.layout === 'grid');
  block.classList.toggle('product-slider--slider', config.layout === 'slider');
  renderSliderShell(block, config.products.map((product) => skeletonCard(product)).join(''));
  const section = block.closest('.section');
  if (section) section.style.display = null;

  let products = [];
  try {
    const payload = await CS_FETCH_GRAPHQL.fetchGraphQl(PRODUCTS_QUERY, {
      variables: {
        skus: config.products.map((product) => product.sku),
        pageSize: config.products.length,
      },
    });
    const bySku = new Map((payload?.data?.productSearch?.items || [])
      .map((item) => item.productView)
      .filter((product) => product?.sku)
      .map((product) => [product.sku, product]));
    products = config.products
      .map((authored) => {
        const product = bySku.get(authored.sku);
        if (!product) return null;
        if (!product.name) product.name = authored.name;
        return product;
      })
      .filter(Boolean);
  } catch (error) {
    console.error(error);
  }

  const needsSlider = config.layout === 'slider' && products.length > visibleCount(config);
  const eagerFirstImage = isFirstSectionBlock(block);
  const imageWidth = cardImageWidth();
  if (eagerFirstImage && products[0]) {
    preloadLcpImage(optimizedImageUrl(productImage(products[0]), imageWidth));
  }
  block.classList.toggle('product-slider--scroll', needsSlider);
  renderSliderShell(
    block,
    products.map((product, index) => cardHtml(product, {
      eager: eagerFirstImage && index === 0,
      width: imageWidth,
    })).join(''),
  );

  if (!products.length) {
    block.classList.remove('product-slider--scroll');
    block.querySelector('.product-slider-track').innerHTML = '<p class="product-slider-empty">No products.</p>';
    return;
  }

  const track = block.querySelector('.product-slider-track');

  const updateSlider = () => {
    const scrolling = config.layout === 'slider' && products.length > visibleCount(config);
    block.classList.toggle('product-slider--scroll', scrolling);
    const previous = block.querySelector('.product-slider-prev');
    const next = block.querySelector('.product-slider-next');
    if (!scrolling || !previous || !next) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    previous.disabled = track.scrollLeft <= 1;
    next.disabled = max > 1 && track.scrollLeft >= max - 1;
  };

  const scrollByCard = (direction) => {
    const card = track.querySelector('.product-slider-card');
    const styles = getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const amount = (card?.getBoundingClientRect().width || track.clientWidth) + gap;
    track.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  block.querySelector('.product-slider-prev').addEventListener('click', () => scrollByCard(-1));
  block.querySelector('.product-slider-next').addEventListener('click', () => scrollByCard(1));
  track.addEventListener('scroll', updateSlider, { passive: true });
  window.addEventListener('resize', updateSlider);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => updateSlider());
    observer.observe(track);
  }
  track.querySelectorAll('img').forEach((image) => {
    if (!image.complete) image.addEventListener('load', updateSlider, { once: true });
  });
  updateSlider();
  window.requestAnimationFrame(updateSlider);
  whenIdle(() => {
    hydrateSliderCards(block, products, compared).catch((error) => console.error(error));
  });
}

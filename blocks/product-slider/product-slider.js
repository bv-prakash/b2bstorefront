import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';
import { Button, Icon, provider as UI } from '@dropins/tools/components.js';
import * as cartApi from '@dropins/storefront-cart/api.js';
import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';
import { CS_FETCH_GRAPHQL, fetchPlaceholders, getProductLink } from '../../scripts/commerce.js';
import '../../scripts/initializers/cart.js';
import '../../scripts/initializers/wishlist.js';

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
          }
        }
      }
    }
  }
}`;

const CONFIG_KEYS = new Set(['layout', 'mobile', 'tablet', 'desktop']);

function positiveCount(value, fallback) {
  const count = Number.parseInt(value, 10);
  return Number.isInteger(count) && count > 0 ? count : fallback;
}

function sliderDefaults() {
  const configured = getConfigValue('plugins.picker.productSlider') || {};
  return {
    layout: configured.layout === 'grid' ? 'grid' : 'slider',
    mobile: positiveCount(configured.mobile, 1),
    tablet: positiveCount(configured.tablet, 2),
    desktop: positiveCount(configured.desktop, 4),
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

function priceAmounts(product) {
  const price = product.price || product.priceRange?.minimum;
  return {
    final: price?.final?.amount,
    regular: price?.regular?.amount,
  };
}

function formatAmount(amount) {
  if (!amount || typeof amount.value !== 'number') return '';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: amount.currency || 'USD',
  }).format(amount.value);
}

function priceHtml(product) {
  const { final, regular } = priceAmounts(product);
  const finalText = formatAmount(final);
  if (!finalText) return '';
  const regularText = formatAmount(regular);
  const sale = regular?.value > final?.value
    ? `<s class="product-slider-card-price-regular">${escapeHtml(regularText)}</s>`
    : '';
  const prefix = product.__typename === 'ComplexProductView' ? 'From ' : '';
  return `<p class="product-slider-card-price">${prefix}<span class="product-slider-card-price-final">${escapeHtml(finalText)}</span>${sale}</p>`;
}

function visibleCount(config) {
  if (window.matchMedia('(min-width: 1200px)').matches) return config.desktop;
  if (window.matchMedia('(min-width: 600px)').matches) return config.tablet;
  return config.mobile;
}

function cardHtml(product) {
  const href = getProductLink(product.urlKey, product.sku);
  const name = product.name || product.sku;
  const image = productImage(product);
  const media = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}">`
    : '';
  return `<article class="product-slider-card">
    <a class="product-slider-card-media" href="${escapeHtml(href)}">${media}</a>
    <div class="product-slider-card-body">
      <a class="product-slider-card-name" href="${escapeHtml(href)}">${escapeHtml(name)}</a>
      ${priceHtml(product)}
      <div class="product-slider-card-actions">
        <div class="product-slider-card-cart"></div>
        <div class="product-slider-card-wishlist"></div>
        <button type="button" class="product-slider-card-compare" aria-pressed="false">Compare</button>
      </div>
    </div>
  </article>`;
}

function renderCompare(panel, compared) {
  if (compared.size < 2) {
    panel.hidden = true;
    panel.replaceChildren();
    return;
  }
  panel.hidden = false;
  panel.innerHTML = `<p class="product-slider-compare-title">Compare</p>
    <ul>${[...compared.values()].map((product) => {
    const image = productImage(product);
    const thumb = image ? `<img src="${escapeHtml(image)}" alt="">` : '';
    return `<li>
      ${thumb}
      <span>${escapeHtml(product.name || product.sku)}</span>
      <span>${escapeHtml(formatAmount(priceAmounts(product).final))}</span>
    </li>`;
  }).join('')}</ul>`;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readSliderConfig(block);
  const labels = await fetchPlaceholders();
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

  block.innerHTML = `<div class="product-slider-controls">
      <button type="button" class="product-slider-prev" aria-label="Previous products">Previous</button>
      <button type="button" class="product-slider-next" aria-label="Next products">Next</button>
    </div>
    <div class="product-slider-track">${products.map((product) => cardHtml(product)).join('')}</div>
    <div class="product-slider-compare" hidden></div>`;

  if (!products.length) {
    block.querySelector('.product-slider-track').innerHTML = '<p class="product-slider-empty">No products.</p>';
    return;
  }

  const track = block.querySelector('.product-slider-track');
  const comparePanel = block.querySelector('.product-slider-compare');
  const cards = [...track.querySelectorAll('.product-slider-card')];

  await Promise.all(products.map(async (product, index) => {
    const card = cards[index];
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
      renderCompare(comparePanel, compared);
    });
  }));

  const updateSlider = () => {
    const needsSlider = config.layout === 'slider' && products.length > visibleCount(config);
    block.classList.toggle('product-slider--scroll', needsSlider);
    if (!needsSlider) return;
    const previous = block.querySelector('.product-slider-prev');
    const next = block.querySelector('.product-slider-next');
    const max = track.scrollWidth - track.clientWidth;
    previous.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max - 1;
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
  updateSlider();
}

import { PRODUCT_SLIDER_DEFAULTS } from '../../blocks/product-slider/defaults.js';
import {
  connectAuthoring, connectUniversalEditor, escapeHtml, mountCatalog,
} from './catalog.js';

const authoring = connectAuthoring();
const universalEditor = connectUniversalEditor();
const selectedProducts = new Map();
const sliderAddEl = document.getElementById('slider-add');
const listEl = document.getElementById('product-list');

function productSliderBlockHtml(products, options) {
  const rows = [
    ['layout', options.layout],
    ['mobile', options.mobile],
    ['tablet', options.tablet],
    ['desktop', options.desktop],
    ['skus', products.map((product) => product.sku).join(',')],
  ];
  const body = rows.map(([key, value]) => `<tr><td><p>${escapeHtml(key)}</p></td><td><p>${escapeHtml(value)}</p></td></tr>`).join('');
  return `<table><tbody><tr><td colspan="2">product-slider</td></tr>${body}</tbody></table>`;
}

function sliderOptions() {
  const layout = document.querySelector('input[name="slider-layout"]:checked')?.value === 'grid' ? 'grid' : 'slider';
  return {
    layout,
    mobile: document.getElementById('slider-mobile').value,
    tablet: document.getElementById('slider-tablet').value,
    desktop: document.getElementById('slider-desktop').value,
  };
}

function updateBreakpointLabel() {
  const label = document.getElementById('slider-breakpoint-label');
  const layout = document.querySelector('input[name="slider-layout"]:checked')?.value;
  label.textContent = layout === 'grid' ? 'Columns' : 'Cards visible';
}

function applySliderDefaults() {
  const layout = PRODUCT_SLIDER_DEFAULTS.layout === 'grid' ? 'grid' : 'slider';
  const selected = document.querySelector(`input[name="slider-layout"][value="${layout}"]`);
  if (selected) selected.checked = true;
  document.getElementById('slider-mobile').value = PRODUCT_SLIDER_DEFAULTS.mobile;
  document.getElementById('slider-tablet').value = PRODUCT_SLIDER_DEFAULTS.tablet;
  document.getElementById('slider-desktop').value = PRODUCT_SLIDER_DEFAULTS.desktop;
  updateBreakpointLabel();
}

function updateAddButton() {
  sliderAddEl.disabled = selectedProducts.size === 0;
  sliderAddEl.textContent = selectedProducts.size
    ? `Add ${selectedProducts.size} products`
    : 'Add products';
}

function toggleSelectedProduct(product) {
  if (selectedProducts.has(product.sku)) selectedProducts.delete(product.sku);
  else selectedProducts.set(product.sku, product);
  const pressed = selectedProducts.has(product.sku);
  listEl.querySelectorAll(`button[data-sku="${CSS.escape(product.sku)}"]`).forEach((item) => {
    item.setAttribute('aria-pressed', String(pressed));
  });
  updateAddButton();
}

async function saveUniversalEditorFields(connection, options, skus) {
  await connection.host.field.onChange(skus);
  if (!connection.host.editorActions?.update || !connection.host.editorState?.get) return;
  try {
    const state = await connection.host.editorState.get();
    const selected = state?.selectedEditables?.[0];
    const target = selected?.id || selected?.editable?.id;
    if (!target) return;
    const fields = [
      ['layout', options.layout],
      ['mobile', options.mobile],
      ['tablet', options.tablet],
      ['desktop', options.desktop],
    ];
    await fields.reduce(async (previous, [name, value]) => {
      await previous;
      await connection.host.editorActions.update({
        target,
        patch: [{ op: 'replace', path: `/${name}`, value: String(value) }],
      });
    }, Promise.resolve());
  } catch (error) {
    console.error(error);
  }
}

async function insertProductSlider() {
  if (!selectedProducts.size) return;
  const options = sliderOptions();
  const skus = [...selectedProducts.values()].map((product) => product.sku).join(',');
  const connection = await universalEditor;
  if (connection?.host?.field?.onChange) {
    await saveUniversalEditorFields(connection, options, skus);
    return;
  }
  const html = productSliderBlockHtml([...selectedProducts.values()], options);
  const actions = await authoring;
  if (actions) {
    actions.sendHTML(html);
    actions.closeLibrary();
  }
}

document.querySelectorAll('input[name="slider-layout"]').forEach((input) => {
  input.addEventListener('change', updateBreakpointLabel);
});
sliderAddEl.addEventListener('click', () => {
  insertProductSlider().catch((error) => console.error(error));
});

applySliderDefaults();

mountCatalog({
  isSelected: (sku) => selectedProducts.has(sku),
  onSelect: toggleSelectedProduct,
});

universalEditor.then(async (connection) => {
  const current = await connection?.host?.field?.getValue?.();
  String(current || '').split(/[\s,]+/).filter(Boolean).forEach((sku) => {
    if (!selectedProducts.has(sku)) selectedProducts.set(sku, { sku, name: sku });
  });
  updateAddButton();
  listEl.querySelectorAll('button[data-sku]').forEach((button) => {
    button.setAttribute('aria-pressed', String(selectedProducts.has(button.dataset.sku)));
  });
}).catch((error) => console.error(error));

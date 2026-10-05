import { connectAuthoring, escapeHtml, mountCatalog } from './catalog.js';

const authoring = connectAuthoring();

function productBlockHtml(sku) {
  const safeSku = escapeHtml(sku);
  // Document Authoring stores blocks as tables. The first row is the block name,
  // which becomes class="product-details" on the published page.
  return `<table><tbody><tr><td colspan="2">product-details</td></tr><tr><td><p>selectSku</p></td><td><p>${safeSku}</p></td></tr><tr><td><p>Grid Ordering Enabled</p></td><td><p>true</p></td></tr></tbody></table>`;
}

mountCatalog({
  async onSelect({ sku }) {
    const actions = await authoring;
    if (actions) {
      actions.sendHTML(productBlockHtml(sku));
      actions.closeLibrary();
      return;
    }
    try {
      await navigator.clipboard.writeText(sku);
    } catch (error) {
      console.error(error);
    }
  },
});

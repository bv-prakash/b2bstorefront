# Product picker

`tools/product-picker/picker.js` is the Document Authoring library page for choosing a store product. Selecting a product inserts a Product Details block whose `selectSku` is that product. Preview then shows the gallery, price, options, and add to cart for that SKU. Other content on the same document stays on the page.

## Guide

1. **Default Category** is the store root and lists every product assigned to this store. It is the same catalog as the root category, so it is not listed a second time.
2. **Product by category** and **Search by SKU** sit on the top row. Expand a parent to see the next level of child categories. A product count appears beside a category when the catalog has one. The product list is below both controls. Categories come from `plugins.picker.rootCategory` in `config.json` (this store uses `2`).
3. Select a product. A Product Details block is added to the document, with `selectSku` set to that product.
4. Preview the page to see the product gallery, price, and add to cart. Other content on the document stays on the page.

Each selection is its own block, so two selections on one document show two products.

## How to use it

Add a row on the site library sheet in Document Authoring. The sheet columns are `title`, `path`, `format`, and `experience`.

| title | path | format | experience |
| --- | --- | --- | --- |
| Products | `https://main--b2bstorefront--bv-prakash.aem.page/tools/product-picker/picker.html` | `fullsize-dialog` | `fullsize-dialog` |

That path must be this picker. The commerce category picker does not list products.

While the code is only local, open `http://localhost:3000/tools/product-picker/picker.html`. After the code is on preview, Document Authoring loads the library path above.

`picker.js` reads `/config.json`, loads categories and products from the catalog, and inserts this table with the Document Authoring `sendHTML` action:

| product-details | |
| --- | --- |
| selectSku | ADB102 |
| Grid Ordering Enabled | true |

The first row becomes `class="product-details"` on the published page, which loads `blocks/product-details/product-details.js`. A plain SKU paragraph does not. Product template pages can still use **Default SKU** when `selectSku` is empty. Delete any older plain `defaultSku` or `sku` text and select the product again.

## Impact

- A document can show a full product details layout for the selected SKU, including other authored content around that block.
- Two Product Details blocks keep two SKUs. Each selected SKU is loaded in its own scope.
- `selectSku` is used before page metadata and the product URL. A shared metadata SKU no longer replaces the selected product.
- **Grid Ordering Enabled** `true` shows the variant grid for a configurable product. A selected SKU with that row omitted still turns the grid on for a configurable product. A simple product keeps the grid hidden. Set the row to `false` to hide it.
- A product list page stays a product list page when a Product Details block is also on the page, including in the footer. The product-page setup no longer sends that page to a 404 when the address has no SKU.
- The normal product template still uses **Default SKU**, page metadata, or `/products/{urlKey}/{sku}`.

## Files required for this feature

| File | Change | Why it is required |
| --- | --- | --- |
| `tools/product-picker/picker.html` | Category list, search, and product list. | The page Document Authoring opens. |
| `tools/product-picker/picker.css` | Styles for that page. | Layout of the picker only. |
| `tools/product-picker/picker.js` | Catalog queries and the inserted `product-details` table. | Writes `selectSku` and Grid Ordering Enabled. |
| `blocks/product-details/_product-details.json` | Authoring field `selectSku`, kept next to `defaultSku`. | Document Authoring recognizes the field. |
| `component-models.json` | Same `selectSku` field. | Merged component model for the block. |
| `blocks/product-details/product-details.js` | Reads `selectSku`, loads that product in its own scope, and enables the variant grid for a selected configurable product. | Renders the product details for the selected SKU. |
| `blocks/product-details/README.md` | Documents `selectSku`. | Block configuration reference. |
| `scripts/commerce.js` | `getProductSku()` reads `selectSku`, then `defaultSku`, then metadata, then the URL. | The page SKU matches the selected block. |
| `scripts/initializers/pdp.js` | Skips the 404 when the page is not a product template and has no page SKU. | A product list page that also contains a Product Details block keeps its own content. |
| `config.json` | `commerce-endpoint`, store headers, and `plugins.picker.rootCategory`. | Already required by the storefront. The picker reads the same file. |

## Stop using the picker

Remove the **Products** row from the Document Authoring library sheet. Authors will no longer see the picker. Documents that already contain a `selectSku` block still render that product until those blocks are deleted.

To remove the picker files as well, delete the `tools/product-picker/` folder. The library path will 404 after that, so remove the library row first.

## Remove the feature from the storefront

Do this only when no document should render a product from `selectSku`. Delete every Product Details block that was inserted by the picker, including blocks in the footer, before reverting the code below. Leaving those blocks in place and restoring the old product-page setup sends the product list page to a 404.

1. Delete `tools/product-picker/`.
2. Remove the **Products** library row.
3. Remove the `selectSku` field from `blocks/product-details/_product-details.json` and `component-models.json`. Leave `defaultSku`.
4. In `blocks/product-details/product-details.js`, remove `loadSelectedProduct` and the `selectSku` scope. Render from the page product again, and set grid ordering only when **Grid Ordering Enabled** is `true`.
5. In `scripts/commerce.js`, stop reading `selectsku` / `select-sku`. Restore `getProductSku()` to page metadata, then the block default SKU, then the product URL.
6. In `scripts/initializers/pdp.js`, restore the missing-SKU path so a product page with no SKU calls `loadErrorPage()`.
7. Remove the `selectSku` row from `blocks/product-details/README.md`.

After that, product pages work from the product URL, page metadata, or **Default SKU** on the product template.

# Product slider

`blocks/product-slider/product-slider.js` renders a row of product cards from SKUs chosen in the product picker. Each card shows the image, name, price, add to cart, wishlist, and compare.

## Authoring

In Document Authoring, open the **Product slider** library item at `tools/product-picker/slider.html`. In Universal Editor, add the Product Slider block and set **Layout**, **Mobile**, **Tablet**, **Desktop**, and **Products**. Both editors store the same table:

| product-slider | |
| --- | --- |
| layout | slider |
| mobile | 1 |
| tablet | 2 |
| desktop | 4 |
| skus | ADB102,COCORESTCONFIG |

`skus` is a comma-separated list. A row whose first cell is a SKU and whose second cell is the product name still renders. The category root comes from `plugins.picker.rootCategory` in `config.json`. The starting layout and card counts live in `blocks/product-slider/defaults.js`. The **Products** field in Universal Editor is the catalog picker.

**Slider** keeps that many cards in view. Previous and Next appear only when the products do not fit that breakpoint. **Grid** uses the same counts as columns and does not show arrows.

A configurable product opens its product page from add to cart. A simple product is added to the cart from the card. Compare lists the selected cards under the block once two or more are chosen.

The picker page is `tools/product-picker/slider.html`, `slider.js`, and `slider.css`. It reads the shared catalog list from `tools/product-picker/catalog.js`. Delete those three slider files, and the **Product slider** library row, to remove this picker while keeping the Product Details picker. Delete `blocks/product-slider/` as well when no document should render the slider.

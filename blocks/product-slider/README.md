# Product slider

`blocks/product-slider/product-slider.js` renders a row of product cards from SKUs chosen in the product picker. Each card shows the image, name, price, add to cart, wishlist, and compare.

## Authoring

Open the **Product slider** library item at `tools/product-picker/slider.html`. That page is separate from the Product Details picker. Select the products, choose **Slider** or **Grid**, and set how many cards are visible on mobile, tablet, and desktop. The inserted table looks like this:

| product-slider | |
| --- | --- |
| layout | slider |
| mobile | 1 |
| tablet | 2 |
| desktop | 4 |
| ADB102 | Gift Packaging |
| COCORESTCONFIG | Cocorest Coconut Mattress |

The first cell of a product row is the SKU. The second cell is the product name. The category root comes from `plugins.picker.rootCategory` in `config.json`. The starting layout and card counts live in `blocks/product-slider/defaults.js`.

**Slider** keeps that many cards in view. Previous and Next appear only when the products do not fit that breakpoint. **Grid** uses the same counts as columns and does not show arrows.

A configurable product opens its product page from add to cart. A simple product is added to the cart from the card. Compare lists the selected cards under the block once two or more are chosen.

The picker page is `tools/product-picker/slider.html`, `slider.js`, and `slider.css`. It reads the shared catalog list from `tools/product-picker/catalog.js`. Delete those three slider files, and the **Product slider** library row, to remove this picker while keeping the Product Details picker. Delete `blocks/product-slider/` as well when no document should render the slider.

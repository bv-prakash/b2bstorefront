# Product slider

`blocks/product-slider/product-slider.js` renders a row of product cards from SKUs chosen in the product picker. Each card shows the image, name, price, add to cart, wishlist, and compare.

## Authoring

Open the **Product slider** library item. It uses the same category tree and SKU search as the product picker. Select the products, choose **Slider** or **Grid**, and set how many cards are visible on mobile, tablet, and desktop. The inserted table looks like this:

| product-slider | |
| --- | --- |
| layout | slider |
| mobile | 1 |
| tablet | 2 |
| desktop | 4 |
| ADB102 | Gift Packaging |
| COCORESTCONFIG | Cocorest Coconut Mattress |

The first cell of a product row is the SKU. The second cell is the product name. `plugins.picker.rootCategory` and `plugins.picker.productSlider` in `config.json` supply the category root and the starting layout counts.

**Slider** keeps that many cards in view. Previous and Next appear only when the products do not fit that breakpoint. **Grid** uses the same counts as columns and does not show arrows.

A configurable product opens its product page from add to cart. A simple product is added to the cart from the card. Compare lists the selected cards under the block once two or more are chosen.

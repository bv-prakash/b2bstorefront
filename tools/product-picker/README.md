# Product picker

Use this picker from the Document Authoring library when a page should show product details for one SKU.

## Library row

| title | path | format |
| --- | --- | --- |
| Products | `https://main--b2bstorefront--bv-prakash.aem.page/tools/product-picker/picker.html` | `fullsize-dialog` |

## How to choose products

1. Open a document. Add any other content you want on the page.
2. Open the Products library item.
3. Leave **All products** selected to list every product assigned to the store.
4. Or choose a category to list only the products in that category.
5. Search by name or SKU if the list is long.
6. Select a product.

The picker inserts a Product Details block whose **defaultSku** is the selected SKU, and a page metadata **sku** with the same value. The rest of the document is left as authored.

## What the page shows

The storefront reads that SKU and renders the product details (gallery, name, price, options, and add to cart) in the Product Details block. Text, images, and other blocks on the same document stay on the page around it.

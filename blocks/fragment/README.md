# Fragment

`blocks/fragment/fragment.js` inlines another document into the current page. The authored cell is a site-root path. `loadFragment` fetches `{path}.plain.html`, rewrites fragment media URLs, decorates those sections, and replaces the block.

Fragment is not a product picker. Do not open `tools/product-picker/picker.html` or `slider.html` for this block. Authoring steps live in `tools/product-picker/README.md`.

## Authoring

In Document Authoring or Universal Editor, add **Fragment** from the section. One cell holds the link:

| fragment | |
| --- | --- |
| [/footer](/footer) | |

Universal Editor fields are **Fragment URL** and **Fragment URL Text**. Those map to the link `href` and the link text. The path must start with `/` and must not start with `//`.

Header, footer, enrichment, targeted-block, and the account sidebar call `loadFragment` themselves. They do not need an authored Fragment table.

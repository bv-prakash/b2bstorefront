# Hero

`blocks/hero/hero.css` styles a full-bleed banner. The authored picture is the background. The `h1` sits on top of it. There is no `hero.js`.

Hero is not a product picker. Do not open `tools/product-picker/picker.html` or `slider.html` for this block. Authoring steps live in `tools/product-picker/README.md`.

## Authoring

In Document Authoring or Universal Editor, add **Hero** from the section. One cell holds the image and the heading:

| hero | |
| --- | --- |
| ![Hero](media_hero.png) Ready to go - B2B! | |

Universal Editor fields are **Image**, **Alt**, and **Text**. Those map to the picture `src`, the picture `alt`, and the `h1`.

The picture is `position: absolute` behind the heading. `isolation: isolate` keeps that image inside the hero so it does not sit under the page background. The heading color is `--background-color` so it reads on the image.

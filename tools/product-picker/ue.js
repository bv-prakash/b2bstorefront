// eslint-disable-next-line import/no-unresolved, import/extensions
import * as guest from 'https://esm.sh/@adobe/uix-guest@1.1.11/es2022/uix-guest.mjs';
import { UE_EXTENSION_ID } from './catalog.js';

const register = guest.register || guest.default?.register;
const base = new URL('./', import.meta.url);

register({
  id: UE_EXTENSION_ID,
  methods: {
    canvas: {
      getRenderers() {
        return [
          {
            extension: UE_EXTENSION_ID,
            dataType: 'product-picker',
            url: new URL('picker.html?editor=ue', base).href,
          },
          {
            extension: UE_EXTENSION_ID,
            dataType: 'product-slider-picker',
            url: new URL('slider.html?editor=ue', base).href,
          },
        ];
      },
    },
  },
}).catch((error) => {
  console.error(error);
});

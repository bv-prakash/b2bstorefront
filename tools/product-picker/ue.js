// eslint-disable-next-line import/no-unresolved
import { register } from 'https://esm.sh/@adobe/uix-guest';

const extensionId = 'b2bstorefront-product-picker';

register({
  id: extensionId,
  methods: {
    canvas: {
      getRenderers() {
        const base = new URL('./', import.meta.url);
        return [
          {
            dataType: 'product-picker',
            url: new URL('picker.html?editor=ue', base).href,
          },
          {
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

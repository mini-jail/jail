import { createEffect, toValue } from "signal";

export default {
  install(app) {
    app.directive("text", (elt, data) => {
      createEffect((currentValue) => {
        const nextValue = String(toValue(data));
        if (nextValue !== currentValue) {
          if (elt.firstChild && elt.firstChild.nodeType === 3) {
            elt.firstChild.data = nextValue;
          } else {
            elt.prepend(nextValue);
          }
        }
        return nextValue;
      });
    });
  },
};

import { createEffect } from "signal";

export default {
  install(app) {
    app.directive("text", (elt, data) => {
      createEffect(() => {
        if (elt.firstChild && elt.firstChild.nodeType === 3) {
          elt.firstChild.data = data();
        } else {
          elt.prepend(String(data()));
        }
      });
    });
  },
};

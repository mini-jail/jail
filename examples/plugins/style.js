import { createEffect } from "signal";

export default {
  install(app) {
    app.directive("style", (elt, styles) => {
      createEffect(() => elt.setAttribute("style", styles()));
    });
  },
};

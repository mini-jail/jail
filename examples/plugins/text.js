export default {
  install(app) {
    app.directive("text", (elt, binding) => {
      const value = String(binding.value);
      if (elt.firstChild && elt.firstChild.nodeType === 3) {
        elt.firstChild.data = value;
      } else {
        elt.prepend(value);
      }
    });
  },
};

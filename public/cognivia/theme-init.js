// Applies the saved light or dark choice before the page paints, to avoid a flash.
// The theme choice is the only thing Cognivia stores in your browser.
(function () {
  try {
    var saved = localStorage.getItem('cognivia-theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (e) {
    /* storage unavailable: follow the system setting */
  }
})();

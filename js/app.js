/* app.js — bootstrap. */
(function () {
  'use strict';
  window.AT.data = window.AT.Storage.load();
  window.AT.UI.init(window.AT.data);
})();

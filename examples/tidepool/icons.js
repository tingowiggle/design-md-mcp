// Tidepool icon set: 24px grid, 1.8 stroke, round caps. Spec: DESIGN.md → Icons.
// Include once per page; it injects an inline sprite so <use href="#i-…"> works
// everywhere, including pages opened straight from disk.
//   <script src="icons.js"></script>
//   <svg class="icon"><use href="#i-check"/></svg>          (line icon)
//   <svg class="icon fill"><use href="#i-spark"/></svg>     (copilot spark only)
(function () {
  var SPRITE = `
  <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 2.5l2.1 6.4 6.4 2.1-6.4 2.1L12 19.5l-2.1-6.4L3.5 11l6.4-2.1z"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.01"/></symbol>
  <symbol id="i-vote" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12l2.5 2.5 4.5-5"/></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="8" r="2.4"/><path d="M16 13.6c2.4.2 4 1.6 4.5 4"/></symbol>
  <symbol id="i-send" viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
  <symbol id="i-wallet" viewBox="0 0 24 24"><rect x="3.5" y="6" width="17" height="13" rx="3"/><path d="M3.5 10h17M16 14.5h1.5"/><path d="M6 6l9-2.5 1 2.5"/></symbol>
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M4 11l8-6.5 8 6.5v8.5H4z"/><path d="M10 19.5v-5h4v5"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><path d="M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/></symbol>
  <symbol id="i-up" viewBox="0 0 24 24"><path d="M5 16l5-5 3.5 3.5L19 9M14 9h5v5"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></symbol>
  <symbol id="i-split" viewBox="0 0 24 24"><path d="M12 20v-7M12 13L6 7M12 13l6-6M6 11V7h4M18 11V7h-4"/></symbol>`;
  window.TIDEPOOL_ICONS = ["i-spark", "i-shield", "i-alert", "i-vote", "i-users", "i-send", "i-clock", "i-check", "i-wallet", "i-home", "i-list", "i-up", "i-copy", "i-split"];
  function inject() {
    if (document.getElementById("tidepool-icons")) return;
    var holder = document.createElement("div");
    holder.innerHTML = '<svg id="tidepool-icons" width="0" height="0" style="position:absolute" aria-hidden="true">' + SPRITE + "</svg>";
    document.body.prepend(holder.firstChild);
  }
  if (document.body) inject(); else document.addEventListener("DOMContentLoaded", inject);
})();

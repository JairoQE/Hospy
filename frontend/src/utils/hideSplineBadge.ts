const HIDE_STYLE =
  "display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;width:0!important;height:0!important;overflow:hidden!important;position:absolute!important;left:-9999px!important;";

function hideElement(el: Element) {
  const node = el as HTMLElement;
  node.setAttribute("aria-hidden", "true");
  node.style.cssText = HIDE_STYLE;
  const parent = node.parentElement;
  if (
    parent &&
    parent !== document.body &&
    parent.childElementCount === 1 &&
    (parent.textContent?.includes("Built with Spline") ||
      parent.querySelector('a[href*="spline"]'))
  ) {
    parent.style.cssText = HIDE_STYLE;
  }
}

function scanRoot(root: ParentNode) {
  root.querySelectorAll('a[href*="spline"], a[href*="splinetool"]').forEach(hideElement);

  root.querySelectorAll("a, div, span, button").forEach((el) => {
    const text = (el.textContent ?? "").trim();
    if (text.includes("Built with Spline")) {
      hideElement(el);
    }
  });

  if (root instanceof Element || root instanceof DocumentFragment) {
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) scanRoot(el.shadowRoot);
    });
  }
}

export function hideSplineBadge() {
  scanRoot(document.body);
}

export function watchSplineBadge() {
  hideSplineBadge();
  const observer = new MutationObserver(() => hideSplineBadge());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href", "style", "class"],
  });
  const interval = window.setInterval(hideSplineBadge, 500);
  return () => {
    observer.disconnect();
    window.clearInterval(interval);
  };
}

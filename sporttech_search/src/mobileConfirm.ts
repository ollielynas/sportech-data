export function isMobileTouch() {
  return (
    typeof window !== "undefined" &&
    ("ontouchstart" in window ||
      window.matchMedia?.("(pointer: coarse)").matches)
  );
}

let activeEl: HTMLElement | null = null;
let hideTimeout: number | null = null;

export function confirmTap(cb: () => void, clientX?: number, clientY?: number) {
  if (!isMobileTouch()) {
    cb();
    return;
  }

  // remove any existing
  if (activeEl) {
    activeEl.remove();
    activeEl = null;
  }
  if (hideTimeout) window.clearTimeout(hideTimeout);

  const el = document.createElement("div");
  el.className = "mobile-click-confirm";
  el.innerHTML = `<button class="mobile-click-confirm-btn">Open</button>`;
  document.body.appendChild(el);

  // position near tap if possible
  const pad = 8;
  const w = 120;
  const h = 40;
  const left = clientX ? Math.max(pad, clientX - w / 2) : pad;
  const top = clientY
    ? Math.max(pad, clientY - h - 10)
    : window.innerHeight - h - 80;
  el.style.position = "fixed";
  el.style.left = left + "px";
  el.style.top = top + "px";
  el.style.zIndex = "9999";

  function cleanup() {
    if (hideTimeout) window.clearTimeout(hideTimeout);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchstart", onTouchStart);
    if (activeEl) {
      activeEl.remove();
      activeEl = null;
    }
  }

  function onTouchMove() {
    // hide and don't trigger callback
    cleanup();
  }

  function onTouchStart(ev: TouchEvent) {
    // if user taps the button, allow; otherwise hide
    const target = ev.target as HTMLElement;
    if (activeEl && activeEl.contains(target)) return;
    cleanup();
  }

  const btn = el.querySelector(
    ".mobile-click-confirm-btn",
  ) as HTMLButtonElement;
  btn.onclick = (e) => {
    e.stopPropagation();
    cleanup();
    cb();
  };

  document.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("touchstart", onTouchStart, { passive: true });

  activeEl = el;
  hideTimeout = window.setTimeout(() => {
    cleanup();
  }, 1200);
}

export default confirmTap;

const PARTIALS = [
  { selector: "#site-header", url: "header.html" },
  { selector: "#site-footer", url: "footer.html" },
];

const loadPartial = async ({ selector, url }) => {
  const target = document.querySelector(selector);
  if (!target) return;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  target.innerHTML = await response.text();
};

const injectLayout = async () => {
  const results = await Promise.allSettled(PARTIALS.map(loadPartial));
  const failed = results.some((result) => result.status === "rejected");
  if (failed) {
    console.warn("Layout partials failed to load.");
  }

  document.dispatchEvent(new CustomEvent("layout:loaded"));
  if (typeof window.initNav === "function") {
    window.initNav();
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectLayout);
} else {
  injectLayout();
}

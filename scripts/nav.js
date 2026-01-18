const initNav = () => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#primary-navigation");
  if (!toggle || !nav) return;
  if (toggle.dataset.navBound === "true") return;

  toggle.dataset.navBound = "true";

  const setAria = (open) =>
    toggle.setAttribute("aria-expanded", String(open));

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    setAria(isOpen);
  });

  const closeMenu = () => {
    if (nav.classList.contains("open")) {
      nav.classList.remove("open");
      setAria(false);
    }
  };

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeMenu();
    }
  });
};

window.initNav = initNav;
initNav();
document.addEventListener("layout:loaded", initNav);
document.addEventListener("DOMContentLoaded", initNav);

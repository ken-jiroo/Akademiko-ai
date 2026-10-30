// Self-executing theme initializer
(function () {
  const savedTheme = localStorage.getItem("akademiko_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
})();

function toggleAkademikoTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const target = current === "light" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", target);
  localStorage.setItem("akademiko_theme", target);
  syncThemeIcon(target);

  // Re-color Chart.js if present
  if (window.donutChart) {
    window.donutChart.options.plugins.legend.labels.color = target === "light" ? "#334155" : "#D0D8E0";
    window.donutChart.update();
  }
  if (window.factorsBarChart) {
    window.factorsBarChart.options.scales.x.ticks.color = target === "light" ? "#475569" : "#D5DEE8";
    window.factorsBarChart.options.scales.y.ticks.color = target === "light" ? "#0f172a" : "#FFFFFF";
    window.factorsBarChart.update();
  }
}

function syncThemeIcon(theme) {
  const icon = document.getElementById("themeIcon");
  if (icon) {
    icon.innerText = theme === "light" ? "🌙" : "☀️";
  }
}

// Bind button listener when page finishes loading
window.addEventListener("DOMContentLoaded", () => {
  const activeTheme = localStorage.getItem("akademiko_theme") || "dark";
  syncThemeIcon(activeTheme);

  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.onclick = toggleAkademikoTheme;
  }
});
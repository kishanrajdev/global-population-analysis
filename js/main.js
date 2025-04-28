import drawChoroplath from "./choroplath.js";
import drawCountryChart from "./countryChart.js";

function init() {
  const hash = window.location.hash;
  if (hash.startsWith("#countryChart?country=")) {
    const country = decodeURIComponent(hash.split("=")[1]);
    drawCountryChart(country);
  } else {
    drawChoroplath();
  }

  window.addEventListener("hashchange", () => {
    const newHash = window.location.hash;
    if (newHash.startsWith("#countryChart?country=")) {
      const country = decodeURIComponent(newHash.split("=")[1]);
      drawCountryChart(country);
    } else {
      document.getElementById("container").innerHTML = "";
      drawChoroplath();
    }
  });
}

init();

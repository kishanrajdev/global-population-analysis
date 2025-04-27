import drawChroplath from "./choroplath.js";
import countryChart from "./countryChart.js";
import worldChart from "./worldChart.js";
import drawCountryBirthDeathRateChart from "./countryBirthDeathRateChart.js";
import worldPopulationRateChart from "./worldPopulationRateChart.js";

window.addEventListener("hashchange", loadPage);
window.addEventListener("load", loadPage);

function loadPage() {
  const hash = location.hash.replace("#", "") || "map";
  const [route, queryString] = hash.split("?");
  const params = new URLSearchParams(queryString);
  document.getElementById("container").innerHTML = "";
  if (route === "map") {   drawChroplath(); }
  if (route === "countryChart") countryChart(params.get("country"));
  if (route === "country-birth-death-rate-chart") drawCountryBirthDeathRateChart(params.get("country"))
  if (route === "world") worldChart();
  if (route === "worldPopulationRate") worldPopulationRateChart(params.get("country"));
}

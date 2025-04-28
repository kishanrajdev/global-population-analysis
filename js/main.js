import drawChroplath from "./choroplath.js";
import countryChart from "./countryChart.js";
import worldChart from "./worldChart.js";
import drawCountryBirthDeathRateChart from "./countryBirthDeathRateChart.js";
import worldPopulationRateChart from "./worldPopulationRateChart.js";
import drawTop10ComparisonChart from "./drawTop10ComparsionChart.js"; // 🚀 new import

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
  if (route === "worldPopulationGrowthChart") worldChart();
  if (route === "worldPopulationRate") worldPopulationRateChart(params.get("country"));
  if (route === "top10Comparison") { // 🚀 new route
    drawTop10ComparisonChart();
  }
  if (route === "countryChart" || route === "country-birth-death-rate-chart") {
    const link = document.getElementById("nav-1");

    link.href = "#countryChart?country=" + params.get("country");   // change href
    link.textContent = `${params.get("country")}'s Total Population Chart`;

    const link2 = document.getElementById("nav-2");

    link2.href = "#country-birth-death-rate-chart?country=" + params.get("country");   // change href
    link2.textContent = `${params.get("country")}'s Population rate chart`;

    document.getElementById("nav-3").classList.add("hidden");

  } else {
    const link = document.getElementById("nav-1");

    link.href = "#worldPopulationGrowthChart";   // change href
    link.textContent = `Global Poulation Chart`;

    const link2 = document.getElementById("nav-2");

    link2.href = "#worldPopulationRate";   // change href
    link2.textContent = `Global Poulation Rate per 100`;

    document.getElementById("nav-3").classList.remove("hidden");

  }

  const nav = document.getElementById("navigation-bar");
  const links = nav.querySelectorAll("a");
  const currentHash = window.location.hash;

  links.forEach(link => {
    if (link.getAttribute("href").includes(route)) {
      link.classList.add("text-yellow-400");   // add yellow from Tailwind
    } else {
      link.classList.remove("text-yellow-400"); // remove yellow if not match
    }
  });

}

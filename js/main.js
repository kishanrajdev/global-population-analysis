import drawChroplath from "./choroplath.js";
import countryChart from "./countryChart.js";

window.addEventListener("hashchange", loadPage);
window.addEventListener("load", loadPage);

function loadPage() {
  console.log('here - ', location.hash);
  const hash = location.hash.replace("#", "") || "map";
  const [route, queryString] = hash.split("?");
  const params = new URLSearchParams(queryString);
  document.getElementById("container").innerHTML = "";
  if (route === "map") {   drawChroplath(); }
  if (route === "countryChart") countryChart(params.get("country"));
  // if (hash === "compare") loadCompare();
}

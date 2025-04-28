export default async function drawChoroplath() {
  const container = document.getElementById("container");
  container.innerHTML = "";

  const width = window.innerWidth;
  const height = window.innerHeight;

  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoMercator()
    .scale(250)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  const tooltip = d3.select("#tooltip");

  const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  const countries = topojson.feature(world, world.objects.countries).features;

  svg.selectAll("path")
    .data(countries)
    .join("path")
    .attr("d", path)
    .attr("fill", "#ccc")
    .attr("stroke", "#fff")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "#999");
      tooltip
        .style("display", "block")
        .html(d.properties.name || "Unknown");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "#ccc");
      tooltip.style("display", "none");
    })
    .on("click", function (event, d) {
      location.hash = `#countryChart?country=${encodeURIComponent(d.properties.name || "Unknown")}`;
    });
}

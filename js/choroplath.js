import Legend from "./d3-legend.js";

export default async function drawChroplath() {
  // Set dimensions
  const container = document.getElementById("container");
  const width = container.offsetWidth;
  const height = container.offsetHeight;

  document.getElementById("pageTitle").textContent = "";

  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const projection = d3.geoEqualEarth()
    .fitExtent([[0, 0], [width, height]], {type: "Sphere"});

  const path = d3.geoPath().projection(projection);

  const colorScale =  d3.scaleDiverging(t => {
    if (t === 0.5) return "white";
    if (t < 0.5) return d3.interpolateRgb("darkred", "white")(t * 2);
    return d3.interpolateRgb("white", "green")((t - 0.5) * 2);
  })
    .domain([-4, 0, 4])
    .clamp(true);

  Legend({
    color: colorScale,
    title: "Population Growth in %",
    // tickFormat: "+%"
  })


  const tooltip = d3.select("#tooltip");

  const population = await getData();

  d3.json("./js/countries-50m.json").then(world => {
    const countries = topojson.feature(world, world.objects.countries).features;

    console.log(countries);

    let countryNames = new Map(
      countries.map(d => [d.id, d.properties.name || "Unknown"])
    );

    // Draw map
    svg.selectAll("path")
      .data(countries)
      .enter().append("path")
      .attr("d", path)
      .attr("fill", d => {
        const name = countryNames.get(d.id) || "Unknown";
        const countryPopulation = population.get(name) || {}
        return colorScale(+countryPopulation.growth);
      }) // Assign random colors
      .attr("stroke", "#fff")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "#E1FB00")
          .attr("stroke-width", 4)
          .attr("stroke-dasharray", "4,2");

        const name = countryNames.get(d.id) || "Unknown";
        // console.log(name);
        const countryPopulation = population.get(name) || {}
        tooltip
          .style("display", "block")
          .html(`<strong>${name}: ${parseFloat(countryPopulation.growth).toFixed(3)}</strong>`);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", null);

        tooltip.style("display", "none");
      })
      .on("click", (event, d) => {
        tooltip.style("display", "none");
        location.hash = `#countryChart?country=${encodeURIComponent(countryNames.get(d.id) || "Unknown")}`;
      })
    ;

    svg.selectAll("text")
      .data(countries)
      .enter().append("text")
      .attr("x", d => projection(d3.geoCentroid(d))[0])
      .attr("y", d => projection(d3.geoCentroid(d))[1])
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "8px")
      .style("pointer-events", "none")
  });
}

async function getData() {
  const population =  await d3.csv("./data/population_growth.csv");
  const populationMap = new Map();
  for (const countryPop of population) {
    populationMap.set(countryPop["Country Name"], {countryCode: countryPop["Country Code"], countryName: countryPop["Country Name"], growth: countryPop["2023"]});
  }
  return populationMap;
}
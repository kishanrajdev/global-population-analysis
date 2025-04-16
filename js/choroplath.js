export default async function drawChroplath() {
  // Set dimensions
  const container = document.getElementById("container");
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  // const width = 1000, height = 600;

// Create an SVG container
  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Define a projection and path generator
  const projection = d3.geoMercator()
    .scale(150)
    .translate([width / 2, height / 1.5]);

  const path = d3.geoPath().projection(projection);

// Define a color scale
  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, 100]); // Adjust domain based on data

  const tooltip = d3.select("#tooltip");

  await getData();
// Load GeoJSON or TopoJSON data
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(world => {
    const countries = topojson.feature(world, world.objects.countries).features;

    // **Extract country names from available data**
    let countryNames = new Map(
      countries.map(d => [d.id, d.properties.name || "Unknown"])
    );

    // Draw map
    svg.selectAll("path")
      .data(countries)
      .enter().append("path")
      .attr("d", path)
      .attr("fill", d => colorScale(Math.random() * 100)) // Assign random colors
      .attr("stroke", "#fff")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke", "#E1FB00")
          .attr("stroke-width", 4)
          .attr("stroke-dasharray", "4,2");

        const name = countryNames.get(d.id) || "Unknown";
        console.log(name);
        tooltip
          .style("display", "block")
          .html(`<strong>${name}</strong>`);
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
        console.log(d);
        location.hash = `#countryChart?country=${encodeURIComponent(countryNames.get(d.id) || "Unknown")}`;
      })
    ;

    // **Add Country Names**
    svg.selectAll("text")
      .data(countries)
      .enter().append("text")
      .attr("x", d => projection(d3.geoCentroid(d))[0])
      .attr("y", d => projection(d3.geoCentroid(d))[1])
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "8px")
      .style("pointer-events", "none") // Prevents interference with clicks
      // .text(d => countryNames.get(d.id)); // Display country names
  });
}

async function getData() {
  const population =  await d3.csv("./data/population_growth.csv");
  return population.map(d => ({countryCode: d["Country Code"], countryName: d["Country Name"], growth: d["2023"]}));
}
export default async function drawCountryChart(countryName) {
  const container = document.getElementById("container");
  container.innerHTML = "";

  const width = window.innerWidth;
  const height = window.innerHeight * 0.9;

  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("text")
    .attr("x", 10)
    .attr("y", 20)
    .attr("class", "back-button")
    .style("cursor", "pointer")
    .style("fill", "black")
    .text("← Back to World Map")
    .on("click", () => location.hash = "");

  // Load population CSVs
  const files = [
    "population_total.csv",
    "population_total_0-14.csv",
    "population_total_15-64.csv",
    "population_total_65_n_above.csv"
  ];
  const [total, age0_14, age15_64, age65] = await Promise.all(
    files.map(file => d3.csv(`./data/${file}`))
  );

  const processData = (data) => {
    const countryData = data.find(d => d["Country Name"] === countryName);
    if (!countryData) return [];

    return Object.entries(countryData)
      .filter(([k]) => !["Country Name", "Country Code"].includes(k))
      .map(([year, value]) => ({
        year: +year,
        value: +value
      }))
      .sort((a, b) => a.year - b.year);
  };

  const seriesTotal = processData(total);
  const series0_14 = processData(age0_14);
  const series15_64 = processData(age15_64);
  const series65 = processData(age65);

  const allData = seriesTotal.map((d, i) => ({
    year: d.year,
    total: d.value,
    age0_14: series0_14[i]?.value || 0,
    age15_64: series15_64[i]?.value || 0,
    age65: series65[i]?.value || 0,
  }));

  const margin = { top: 60, right: 60, bottom: 60, left: 100 };
  const chartWidth = width * 0.5 - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const mapWidth = width * 0.5;

  // Country map section
  const geo = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  const features = topojson.feature(geo, geo.objects.countries).features;
  const selectedCountry = features.find(f => f.properties.name === countryName);

  const mapGroup = svg.append("g").attr("transform", `translate(0, ${margin.top})`);
  const chartGroup = svg.append("g").attr("transform", `translate(${mapWidth}, ${margin.top})`);

  const mapProjection = d3.geoMercator().fitSize([mapWidth, chartHeight], selectedCountry);
  const mapPath = d3.geoPath().projection(mapProjection);

  mapGroup.selectAll("path")
    .data([selectedCountry])
    .enter()
    .append("path")
    .attr("d", mapPath)
    .attr("fill", "darkseagreen")
    .attr("stroke", "black");

  mapGroup.append("text")
    .attr("x", mapWidth / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text(countryName);

  // Area chart
  const x = d3.scaleLinear()
    .domain(d3.extent(allData, d => d.year))
    .range([0, chartWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.total)]).nice()
    .range([chartHeight, 0]);

  const area = (field, color) => d3.area()
    .x(d => x(d.year))
    .y0(chartHeight)
    .y1(d => y(d[field]));

  const colors = {
    age65: "firebrick",
    age0_14: "cornflowerblue",
    age15_64: "yellowgreen",
    total: "lightgray"
  };

  const layers = [
    { key: "total", label: "Total", color: colors.total },
    { key: "age15_64", label: "15–64", color: colors.age15_64 },
    { key: "age0_14", label: "0–14", color: colors.age0_14 },
    { key: "age65", label: "65+", color: colors.age65 }
  ];

  layers.forEach(layer => {
    chartGroup.append("path")
      .datum(allData)
      .attr("fill", layer.color)
      .attr("d", area(layer.key));
  });

  chartGroup.append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")))
    .selectAll("text")
    .style("font-size", "12px");

  chartGroup.append("g")
    .call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(",.0f")))
    .selectAll("text")
    .style("font-size", "12px");

  // Title
  chartGroup.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text(`Population Trends for ${countryName}`);

  // Legend
  const legend = chartGroup.append("g")
    .attr("transform", `translate(${chartWidth - 100}, 0)`);

  layers.reverse().forEach((layer, i) => {
    const legendItem = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    legendItem.append("rect").attr("width", 15).attr("height", 15).attr("fill", layer.color);
    legendItem.append("text").attr("x", 20).attr("y", 12).style("font-size", "12px").text(layer.label);
  });
}

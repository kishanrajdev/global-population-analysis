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

  // Load your data
  const [populationFiles, birthDeathDataRaw, geo] = await Promise.all([
    Promise.all([
      d3.csv("./data/population_total.csv"),
      d3.csv("./data/population_total_0-14.csv"),
      d3.csv("./data/population_total_15-64.csv"),
      d3.csv("./data/population_total_65_n_above.csv")
    ]),
    d3.csv("./data/merged_birth_death_rates.csv", d3.autoType),
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
  ]);

  const [totalData, age0_14Data, age15_64Data, age65Data] = populationFiles;

  const processPopulation = (data) => {
    const countryData = data.find(d => d["Country Name"] === countryName);
    if (!countryData) return [];
    return Object.entries(countryData)
      .filter(([k]) => !["Country Name", "Country Code"].includes(k))
      .map(([year, value]) => ({
        year: +year,
        value: value === "" ? null : +value
      }))
      .filter(d => d.value !== null)
      .sort((a, b) => a.year - b.year);
  };

  const seriesTotal = processPopulation(totalData);
  const series0_14 = processPopulation(age0_14Data);
  const series15_64 = processPopulation(age15_64Data);
  const series65 = processPopulation(age65Data);

  const allPopulationData = seriesTotal.map((d, i) => ({
    year: d.year,
    total: d.value,
    age0_14: series0_14[i]?.value || 0,
    age15_64: series15_64[i]?.value || 0,
    age65: series65[i]?.value || 0,
  }));

  const birthDeathData = birthDeathDataRaw.filter(d => d["Country Name"] === countryName);

  const margin = { top: 60, right: 100, bottom: 60, left: 80 };
  const chartWidth = width * 0.5 - margin.left - margin.right;
  const chartHeight = height / 2 - margin.top - margin.bottom;
  const mapWidth = width * 0.5;

  // Map Section
  const features = topojson.feature(geo, geo.objects.countries).features;
  const selectedCountry = features.find(f => f.properties.name === countryName);

  const mapGroup = svg.append("g").attr("transform", `translate(0, ${margin.top})`);
  const chartGroup = svg.append("g").attr("transform", `translate(${mapWidth}, ${margin.top})`);
  const chartGroupLine = svg.append("g").attr("transform", `translate(${mapWidth}, ${margin.top + chartHeight + 100})`);

  const mapProjection = d3.geoMercator()
    .fitSize([mapWidth, height - margin.top - margin.bottom], selectedCountry);
  const mapPath = d3.geoPath().projection(mapProjection);

  mapGroup.selectAll("path")
    .data([selectedCountry])
    .enter()
    .append("path")
    .attr("d", mapPath)
    .attr("fill", "darkseagreen")
    .attr("stroke", "black");

  // --- FLAG ---
  const bounds = mapPath.bounds(selectedCountry);
  const [x0, y0] = bounds[0];
  const [x1, y1] = bounds[1];
  const flagWidth = (x1 - x0) * 0.4;
  const flagHeight = (y1 - y0) * 0.3;

  mapGroup.append("image")
    .attr("href", `./flags/${countryName}.png`)
    .attr("x", (x0 + x1) / 2 - flagWidth / 2)
    .attr("y", (y0 + y1) / 2 - flagHeight / 2)
    .attr("width", flagWidth)
    .attr("height", flagHeight);

  mapGroup.append("text")
    .attr("x", mapWidth / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text(countryName);

  // Area Chart - Population
  const xPop = d3.scaleLinear()
    .domain(d3.extent(allPopulationData, d => d.year))
    .range([0, chartWidth]);

  const yPop = d3.scaleLinear()
    .domain([0, d3.max(allPopulationData, d => d.total)]).nice()
    .range([chartHeight, 0]);

  const areaPop = (field) => d3.area()
    .x(d => xPop(d.year))
    .y0(chartHeight)
    .y1(d => yPop(d[field]))
    .curve(d3.curveMonotoneX);

  const popLayers = [
    { key: "total", color: "lightgray" },
    { key: "age15_64", color: "yellowgreen" },
    { key: "age0_14", color: "cornflowerblue" },
    { key: "age65", color: "firebrick" }
  ];

  popLayers.forEach(layer => {
    chartGroup.append("path")
      .datum(allPopulationData)
      .attr("fill", layer.color)
      .attr("d", areaPop(layer.key));
  });

  chartGroup.append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xPop).ticks(10).tickFormat(d3.format("d")));

  chartGroup.append("g")
    .call(d3.axisLeft(yPop));

  chartGroup.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text(`Population Trends for ${countryName}`);

  // Line Chart - Birth and Death
  const x = d3.scaleLinear()
    .domain(d3.extent(birthDeathData, d => d.Year))
    .range([0, chartWidth]);

  const yBirth = d3.scaleLinear()
    .domain([0, d3.max(birthDeathData, d => d["Birth Rate"]) * 1.1])
    .range([chartHeight, 0]);

  const yDeath = d3.scaleLinear()
    .domain([0, d3.max(birthDeathData, d => d["Death Rate"]) * 1.1])
    .range([chartHeight, 0]);

  chartGroupLine.append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

  chartGroupLine.append("g")
    .call(d3.axisLeft(yBirth));

  chartGroupLine.append("g")
    .attr("transform", `translate(${chartWidth},0)`)
    .call(d3.axisRight(yDeath));

  const lineBirth = d3.line()
    .x(d => x(d.Year))
    .y(d => yBirth(d["Birth Rate"]))
    .curve(d3.curveMonotoneX);

  const lineDeath = d3.line()
    .x(d => x(d.Year))
    .y(d => yDeath(d["Death Rate"]))
    .curve(d3.curveMonotoneX);

  const birthPath = chartGroupLine.append("path")
    .datum(birthDeathData)
    .attr("fill", "none")
    .attr("stroke", "green")
    .attr("stroke-width", 2)
    .attr("d", lineBirth);

  const deathPath = chartGroupLine.append("path")
    .datum(birthDeathData)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .style("stroke-dasharray", ("4,2"))
    .attr("d", lineDeath);

  chartGroupLine.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text(`Birth and Death Rates for ${countryName}`);

  const legend = chartGroupLine.append("g")
    .attr("transform", `translate(${chartWidth - 150}, 10)`);

  legend.append("line")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 20)
    .attr("y2", 0)
    .attr("stroke", "green")
    .attr("stroke-width", 2);

  legend.append("text")
    .attr("x", 30)
    .attr("y", 5)
    .text("Birth Rate")
    .style("font-size", "12px");

  legend.append("line")
    .attr("x1", 0)
    .attr("y1", 30)
    .attr("x2", 20)
    .attr("y2", 30)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .style("stroke-dasharray", ("4,2"));

  legend.append("text")
    .attr("x", 30)
    .attr("y", 35)
    .text("Death Rate")
    .style("font-size", "12px");

  // ✨ Animation
  birthPath
    .attr("stroke-dasharray", function() { return this.getTotalLength(); })
    .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
    .transition()
    .duration(1500)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);

  deathPath
    .attr("stroke-dasharray", function() { return this.getTotalLength(); })
    .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
    .transition()
    .duration(1500)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);
}

const processData = (countryName, data, predictions) => {
  const countryData = data.find(d => d["Country Name"].toLowerCase() === countryName.toLowerCase());
  if (!countryData) return [];

  let func_year = 0;
  const processedData = Object.entries(countryData)
    .filter(([k]) => !["Country Name", "Country Code"].includes(k))
    .map(([year, value]) => {
      if (+year) func_year = +year;
      return {
        year: +year,
        value: +value
      };
    })
    .filter(c => !!c.year)
    .sort((a, b) => a.year - b.year);

  let startYear = func_year;
  for (const prediction of predictions) {
    processedData.push({ year: ++startYear, value: parseInt(prediction) });
  }

  return processedData;
};

function isoCode(countryName) {
  const codes = {
    "united states": "us",
    "united kingdom": "gb",
    "india": "in",
    "china": "cn",
    "russia": "ru",
    "japan": "jp",
    "nepal": "np",
    "ukraine": "ua",
    "indonesia": "id",
    "canada": "ca",
    "brazil": "br",
    "germany": "de",
    "france": "fr",
    "mexico": "mx",
    "nigeria": "ng",
    "bangladesh": "bd",
    "ethiopia": "et"
  };
  return codes[countryName.toLowerCase()] || "un";
}

export default async function drawCountryChart(countryName) {
  const url = `http://127.0.0.1:5000/predict/total_population`;

  const [apiDataAll, apiData0, apiData15, apiData65] = await Promise.all([
    fetch(`${url}/all/${countryName}`).then(res => res.json()),
    fetch(`${url}/0/${countryName}`).then(res => res.json()),
    fetch(`${url}/15/${countryName}`).then(res => res.json()),
    fetch(`${url}/65/${countryName}`).then(res => res.json())
  ]);

  const files = [
    "population_total.csv",
    "population_total_0-14.csv",
    "population_total_15-64.csv",
    "population_total_65_n_above.csv"
  ];
  const [total, age0_14, age15_64, age65] = await Promise.all(
    files.map(file => d3.csv(`./data/${file}`))
  );

  const seriesTotal = processData(countryName, total, apiDataAll.predictions);
  const series0_14 = processData(countryName, age0_14, apiData0.predictions);
  const series15_64 = processData(countryName, age15_64, apiData15.predictions);
  const series65 = processData(countryName, age65, apiData65.predictions);

  const parseYear = d3.timeParse("%Y");

  const data = seriesTotal.map((d, i) => ({
    year: parseYear(d.year.toString()),
    total: d.value,
    age0_14: series0_14[i]?.value || 0,
    age15_64: series15_64[i]?.value || 0,
    age65: series65[i]?.value || 0
  }));

  const seriesKeys = ["total", "age0_14", "age15_64", "age65"];
  const labels = {
    total: "Total Population",
    age0_14: "Age 0–14",
    age15_64: "Age 15–64",
    age65: "Age 65+"
  };

  const container = document.getElementById("container");
  container.innerHTML = "";

  const margin = { top: 60, right: 400, bottom: 80, left: 100 };
  const width = container.offsetWidth - margin.left - margin.right;
  const height = container.offsetHeight - margin.top - margin.bottom;

  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.year))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.total, d.age0_14, d.age15_64, d.age65))])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(seriesKeys)
    .range(["#f5e663", "#66b3ff", "#7fd37e", "#f17a63"]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.timeFormat("%Y")))
    .selectAll("text")
    .attr("fill", "white")
    .attr("font-weight", "bold")
    .attr("font-size", "14px");

  g.append("g")
    .call(d3.axisLeft(y).ticks(10).tickFormat(d3.format(",")))
    .selectAll("text")
    .attr("fill", "white")
    .attr("font-weight", "bold")
    .attr("font-size", "14px");

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.8)")
    .style("color", "white")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("font-size", "14px")
    .style("font-weight", "bold");

  seriesKeys.forEach(name => {
    const lineData = data.map(d => ({ year: d.year, value: d[name] }));

    g.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", color(name))
      .attr("stroke-width", 3)
      .attr("d", line)
      .style("opacity", 0)
      .transition()
      .duration(2000)
      .style("opacity", 1);

    g.selectAll(`.dot-${name}`)
      .data(lineData)
      .enter()
      .append("circle")
      .attr("class", `dot-${name}`)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.value))
      .attr("r", 5)
      .attr("fill", color(name))
      .on("mouseover", function(event, d) {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`${labels[name]}<br>Year: ${d3.timeFormat("%Y")(d.year)}<br>Population: ${d3.format(",")(d.value)}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 30) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition().duration(500).style("opacity", 0);
      });
  });

  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left},${height + margin.top + 30})`);

  seriesKeys.forEach((key, i) => {
    const legendItem = legend.append("g")
      .attr("transform", `translate(${i * 150},0)`);

    legendItem.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", color(key));

    legendItem.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .attr("fill", "white")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(labels[key]);
  });

  // Country Map + Flag
  const geo = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  const features = topojson.feature(geo, geo.objects.countries).features;
  const selectedCountry = features.find(f => f.properties.name.toLowerCase() === countryName.toLowerCase());

  if (selectedCountry) {
    const mapGroup = svg.append("g")
      .attr("transform", `translate(${width + margin.left + 20},${margin.top})`);

    // Flag
    mapGroup.append("image")
      .attr("href", `https://flagcdn.com/h80/${isoCode(countryName)}.png`)
      .attr("width", 80)
      .attr("height", 60)
      .attr("x", 85)
      .attr("y", -80);

    const projection = d3.geoMercator()
      .fitExtent([[0, 0], [250, 250]], selectedCountry);

    mapGroup.append("path")
      .datum(selectedCountry)
      .attr("d", d3.geoPath().projection(projection))
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-width", 2);

    mapGroup.append("text")
      .attr("x", 125)
      .attr("y", 270)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "white")
      .text(countryName);
  }
}

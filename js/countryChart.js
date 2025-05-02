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
      }
    })
    .filter(c => !!c.year)
    .sort((a, b) => a.year - b.year);

  let startYear = func_year
  for (const prediction of predictions) {
    processedData.push({year: ++startYear, value: parseInt(prediction)});
  }

  return processedData;
};

export default async function drawCountryChart(countryName) {
  // const url = `http://127.0.0.1:5000/predict/total_population`;
  //
  // const [apiDataAll, apiData0, apiData15, apiData65] = await Promise.all([
  //   fetch(`${url}/all/${countryName}`).then(res => res.json()),
  //   fetch(`${url}/0/${countryName}`).then(res => res.json()),
  //   fetch(`${url}/15/${countryName}`).then(res => res.json()),
  //   fetch(`${url}/65/${countryName}`).then(res => res.json()),
  // ]);

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

  const seriesTotal = processData(countryName, total, []);
  const series0_14 = processData(countryName, age0_14, []);
  const series15_64 = processData(countryName, age15_64, []);
  const series65 = processData(countryName, age65, []);

  const parseYear = d3.timeParse("%Y");

  const data = seriesTotal.map((d, i) => ({
    year: parseYear(d.year.toString()),
    total: d.value,
    age0_14: series0_14[i]?.value || 0,
    age15_64: series15_64[i]?.value || 0,
    age65: series65[i]?.value || 0,
  }));

  const seriesKeys = ["total", "age0_14", "age15_64", "age65"];
  const labels = {
    total: "Total Population",
    age0_14: "Age 0–14",
    age15_64: "Age 15–64",
    age65: "Age 65+"
  };

  document.getElementById("pageTitle").textContent =  countryName + " Population Chart";

  const container = document.getElementById("container");
  container.innerHTML = "";

  const margin = {top: 30, right: 120, bottom: 40, left: 120};
  const width = container.offsetWidth - margin.left - margin.right;
  const height = container.offsetHeight - margin.top - margin.bottom;

  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom + 60)

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
    .range(["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"]);

  g.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height})`)
    .attr("class", "text-sm")
    .call(d3.axisBottom(x).ticks(10));

  g.append("g")
    .attr("class", "y axis")
    .attr("class", "text-sm")
    .call(d3.axisLeft(y));

  // Create the tooltip
  const tooltip = d3.select("#container")
    .append("div")
    .attr("class", "absolute text-xs p-2 rounded shadow opacity-0 pointer-events-none")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("position", "absolute");

  const lineGenerator = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value));

  seriesKeys.forEach(name => {
    const lineData = data.map(d => ({year: d.year, value: d[name]}));
    const path = g.append("path")
      .datum(lineData)
      .attr("class", "line")
      .attr("stroke", color(name))
      .attr("fill", "none")
      .attr("stroke-width", "2")
      .attr("d", lineGenerator)
      .on("mouseover", function(event) {
        d3.select(this).attr("stroke-width", "4");
        tooltip.style("opacity", 1);
      })
      .on("mousemove", function(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = x.invert(mouseX);
        const bisect = d3.bisector(d => d.year).left;
        const idx = bisect(lineData, x0, 1);
        const d0 = lineData[idx - 1];
        const d1 = lineData[idx];
        const d = x0 - d0?.year > d1?.year - x0 ? d1 : d0;

        if (d) {
          tooltip
            .html(`
            <div><strong>${labels[name]}</strong></div>
            <div>Year: ${d.year.getFullYear()}</div>
            <div>Value: ${d.value.toLocaleString()}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px")
            .style("opacity", 1);
        }
      })
      .on("mouseout", function() {
        d3.select(this).attr("stroke-width", "2");
        tooltip.style("opacity", 0);
      });

    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);
  });

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${margin.left}, ${height + margin.top + 40})`);

  seriesKeys.forEach((key, i) => {
    const legendItem = legend.append("g")
      .attr("transform", `translate(${i * 150}, 0)`);

    legendItem.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .style("fill", color(key));

    legendItem.append("text")
      .attr("x", 18)
      .attr("y", 6)
      .attr("dy", "0.35em")
      .style("font-size", "14px")
      .style("fill", "#fff")
      .text(labels[key]);
  });
}
const processData = (data, predictions) => {

  const processedData = data.sort((a, b) => a.year - b.year);

  let startYear = 2024
  for (const prediction of predictions) {
    processedData.push({year: startYear++, value: parseInt(prediction)});
  }

  return processedData;
};

export default async function worldChart() {
  // const url = `http://127.0.0.1:5000/predict/total_population`;
  //
  // const [apiDataAll, apiData0, apiData15, apiData65] = await Promise.all([
  //   fetch(`${url}/all/`).then(res => res.json()),
  //   fetch(`${url}/0/`).then(res => res.json()),
  //   fetch(`${url}/15/`).then(res => res.json()),
  //   fetch(`${url}/65/`).then(res => res.json()),
  // ]);

  // Load population CSVs
  const files = [
    "population_total.csv",
    "population_total_0-14.csv",
    "population_total_15-64.csv",
    "population_total_65_n_above.csv"
  ];
  const [total, age0_14, age15_64, age65] = await Promise.all(
    files.map(file => d3.csv(`./data/${file}`)
      .then(data => {
        let year = 1960
        const arr = []
        while (year < 2024) {
          const total = d3.sum(data, d => isNaN(+d[year]) ? 0 : +d[year]);
          arr.push({year: +year, value: total});
          year++;
        }
        return arr
      })
    )
  );

  const seriesTotal = processData(total, []);
  const series0_14 = processData(age0_14, []);
  const series15_64 = processData(age15_64, []);
  const series65 = processData(age65, []);

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

  const container = document.getElementById("container");
  container.innerHTML = "";

  document.getElementById("pageTitle").textContent = "Global Poulation Chart";

  const margin = {top: 30, right: 120, bottom: 100, left: 120};
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

  const line = d3.line()
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
      .attr("d", line)
      .on("mouseover", function(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = x.invert(mouseX);
        const bisect = d3.bisector(d => d.year).left;
        const idx = bisect(lineData, x0, 1);
        const d0 = lineData[idx - 1];
        const d1 = lineData[idx];
        const d = x0 - d0?.year > d1?.year - x0 ? d1 : d0;
        if (d) {

          tooltip.style("opacity", 1)
            .html(`<strong>Year:</strong> ${d.year.getFullYear()}<br><strong>Value:</strong> ${d.value.toLocaleString()}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");

          d3.select(this)
            .style("stroke-width", "4");
        }
      })
      .on("mouseout", function() {
        tooltip.style("opacity", 0);
        d3.select(this)
          .style("stroke-width", "2");
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 20) + "px");
      })
    ;

    // Add transition
    const totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);
  });

  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("color", "#fff")
    .style("padding", "6px 8px")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("opacity", 0);

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
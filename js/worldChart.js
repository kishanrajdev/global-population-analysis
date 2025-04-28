const processData = (data, predictions) => {
  const processedData = data.sort((a, b) => a.year - b.year);

  let startYear = 2024;
  for (const prediction of predictions) {
    processedData.push({ year: startYear++, value: parseInt(prediction) });
  }
  return processedData;
};

export default async function worldPredictionLineChart() {
  const container = document.getElementById("container");
  container.innerHTML = "";

  const margin = { top: 80, right: 150, bottom: 100, left: 100 };
  const width = window.innerWidth - margin.left - margin.right;
  const height = window.innerHeight * 0.8 - margin.top - margin.bottom;

  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select("#tooltip")
    .style("position", "absolute")
    .style("background", "black")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "6px")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("opacity", 0)
    .style("pointer-events", "none");

  const url = `http://127.0.0.1:5000/predict/total_population`;

  const [apiDataAll, apiData0, apiData15, apiData65] = await Promise.all([
    fetch(`${url}/all/`).then(res => res.json()),
    fetch(`${url}/0/`).then(res => res.json()),
    fetch(`${url}/15/`).then(res => res.json()),
    fetch(`${url}/65/`).then(res => res.json()),
  ]);

  const files = [
    "population_total.csv",
    "population_total_0-14.csv",
    "population_total_15-64.csv",
    "population_total_65_n_above.csv"
  ];

  const [total, age0_14, age15_64, age65] = await Promise.all(
    files.map(file => d3.csv(`./data/${file}`)
      .then(data => {
        let year = 1960;
        const arr = [];
        while (year < 2024) {
          const sum = d3.sum(data, d => isNaN(+d[year]) ? 0 : +d[year]);
          arr.push({ year: +year, value: sum });
          year++;
        }
        return arr;
      })
    )
  );

  const seriesTotal = processData(total, apiDataAll.predictions);
  const series0_14 = processData(age0_14, apiData0.predictions);
  const series15_64 = processData(age15_64, apiData15.predictions);
  const series65 = processData(age65, apiData65.predictions);

  const data = seriesTotal.map((d, i) => ({
    year: d.year,
    total: d.value,
    age0_14: series0_14[i]?.value || 0,
    age15_64: series15_64[i]?.value || 0,
    age65: series65[i]?.value || 0,
  }));

  const keys = ["total", "age0_14", "age15_64", "age65"];
  const labels = {
    total: "Total Population",
    age0_14: "Age 0–14",
    age15_64: "Age 15–64",
    age65: "Age 65+"
  };

  const colors = d3.scaleOrdinal()
    .domain(keys)
    .range(["#f2e394", "#6bc5d2", "#93d94e", "#f27059"]);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.total)])
    .nice()
    .range([height, 0]);

  const formatPopulation = d3.format(".2s"); // e.g., 2B, 5B

  const line = key => d3.line()
    .defined(d => d[key] !== null)
    .x(d => x(d.year))
    .y(d => y(d[key]))
    .curve(d3.curveMonotoneX);

  // Add lines
  const paths = keys.map(key => {
    const path = svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", colors(key))
      .attr("stroke-width", 3)
      .attr("d", line(key))
      .attr("id", `line-${key}`)
      .style("opacity", 1);

    const totalLength = path.node().getTotalLength();

    path
      .attr("stroke-dasharray", totalLength + " " + totalLength)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(3000)
      .ease(d3.easeLinear)
      .attr("stroke-dashoffset", 0);

    return path;
  });

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")))
    .selectAll("text")
    .attr("fill", "white")
    .attr("font-size", "14px")
    .attr("font-weight", "bold");

  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(formatPopulation))
    .selectAll("text")
    .attr("fill", "white")
    .attr("font-size", "14px")
    .attr("font-weight", "bold");

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "28px")
    .style("font-weight", "bold")
    .style("fill", "white")
    .text("World Population Prediction (1960–2035)");

  // Crosshair for hover
  const focusLine = svg.append("line")
    .style("stroke", "white")
    .style("stroke-width", "2px")
    .style("stroke-dasharray", "3,3")
    .style("opacity", 0);

  const overlay = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mousemove", mousemove)
    .on("mouseover", () => {
      focusLine.style("opacity", 1);
      tooltip.transition().duration(300).style("opacity", 1);
    })
    .on("mouseout", () => {
      focusLine.style("opacity", 0);
      tooltip.transition().duration(300).style("opacity", 0);
    });

  function mousemove(event) {
    const [mx] = d3.pointer(event);
    const year = Math.round(x.invert(mx));

    const currentData = data.find(d => d.year === year);
    if (!currentData) return;

    focusLine
      .attr("x1", x(year))
      .attr("x2", x(year))
      .attr("y1", 0)
      .attr("y2", height);

    tooltip
      .html(`
        <div><strong>Year: ${year}</strong></div>
        <div style="color:${colors("total")}">Total: ${d3.format(",")(currentData.total)}</div>
        <div style="color:${colors("age0_14")}">0–14: ${d3.format(",")(currentData.age0_14)}</div>
        <div style="color:${colors("age15_64")}">15–64: ${d3.format(",")(currentData.age15_64)}</div>
        <div style="color:${colors("age65")}">65+: ${d3.format(",")(currentData.age65)}</div>
      `)
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 30) + "px");
  }

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width + 30},0)`);

  keys.forEach((key, i) => {
    const legendItem = legend.append("g")
      .attr("transform", `translate(0, ${i * 30})`)
      .style("cursor", "pointer")
      .on("click", function() {
        const path = d3.select(`#line-${key}`);
        const isVisible = path.style("opacity") === "1";
        path.transition().duration(500).style("opacity", isVisible ? 0 : 1);
      });

    legendItem.append("rect")
      .attr("width", 16)
      .attr("height", 16)
      .style("fill", colors(key));

    legendItem.append("text")
      .attr("x", 22)
      .attr("y", 12)
      .style("fill", "white")
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .text(labels[key]);
  });
}

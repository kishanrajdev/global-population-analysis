const processData = (countryName, data, predictions, type ="") => {
  const countryData = data.find(d => d["Country Name"].toLowerCase() === countryName.toLowerCase());
  if (!countryData) return [];

  let processedData = Object.entries(countryData)
    .filter(([k]) => !["Country Name", "Country Code"].includes(k))
    .map(([year, value]) => {
      return {
        year: +year,
        value: +value
      }
    })
    .filter(c => !!c.year && c.year < 2023)
    .sort((a, b) => a.year - b.year);

  let startYear = 2023
  for (const prediction of predictions) {
    processedData.push({year: startYear++, value: prediction});
  }

  if (type !== "total") {
    processedData = processedData.map(d => ({...d, value: d.value / 10}));
  } else {
    processedData = processedData.map((d, i, arr) => {
      if (i === 0 || d.year === 2023) {
        return { year: d.year, value: 0 };
      }
      const prev = arr[i - 1].value;
      const change = ((d.value - prev) / prev) * 100;
      return { year: d.year, value: change };
    })
  }
  processedData = processedData.filter((d) => d.year > 1961);
  return processedData;
};

export default async function drawCountryBirthDeathRateChart(countryName) {
  // const url = `http://127.0.0.1:5000/predict/population_by_birth_death`;

  // const apiData = await fetch(`${url}/${countryName}`).then(res => res.json());

  // Load population CSVs
  const files = [
    "population_total.csv",
    "population_birth_rate.csv",
    "population_death.csv"
  ];
  const [total, birthrate, deathrate] = await Promise.all(
    files.map(file => d3.csv(`./data/${file}`))
  );

  const seriesTotal = processData(countryName, total, [], "total");
  const seriesBirthRate = processData(countryName, birthrate, []);
  const seriesDeathRate = processData(countryName, deathrate, []);

  const parseYear = d3.timeParse("%Y");

  const data = seriesTotal.map((d, i) => ({
    year: parseYear(d.year.toString()),
    total: d.value,
    birthrate: seriesBirthRate[i]?.value || 0,
    deathrate: seriesDeathRate[i]?.value || 0
  }));

  const seriesKeys = ["total", "birthrate", "deathrate"];
  const labels = {
    total: "Total Population",
    birthrate: "Birth rate",
    deathrate: "Death rate"
  };

  document.getElementById("pageTitle").textContent = countryName+ " Poulation Rate Chart";
  const container = document.getElementById("container");
  container.innerHTML = "";

  const margin = {top: 30, right: 100, bottom: 40, left: 50};
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

  const yMin = d3.min(data, d => Math.min(d.total, d.birthrate, d.deathrate));
  const yMax = d3.max(data, d => Math.max(d.total, d.birthrate, d.deathrate));

  const y = d3.scaleLinear()
    .domain([Math.min(0, yMin), yMax])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(seriesKeys)
    .range(["#e41a1c", "#377eb8", "#4daf4a"]);

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

  const tooltip = d3.select("#container")
    .append("div")
    .attr("class", "absolute text-xs p-2 rounded shadow opacity-0 pointer-events-none")
    .style("background", "rgba(0, 0, 0, 0.7)")
    .style("position", "absolute");

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
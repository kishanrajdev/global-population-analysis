export default async function drawTop10ComparisonChart() {
  const container = document.getElementById("container");
  container.innerHTML = "";
  document.getElementById("pageTitle").textContent = "Vertical Population Distribution by Age Group (2023)";


  const margin = {top: 30, right: 120, bottom: 100, left: 120};
  const width = container.offsetWidth - margin.left - margin.right;
  const height = container.offsetHeight - margin.top - margin.bottom;


  const svg = d3.select("#container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const tooltip = d3.select("#tooltip")
    .style("position", "absolute")
    .style("padding", "10px")
    .style("background", "black")
    .style("color", "white")
    .style("border-radius", "8px")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("display", "none")
    .style("pointer-events", "none")
    .style("opacity", 0);

  const selectedCountries = [
    "India", "China", "United States", "Indonesia", "Nigeria",
    "Brazil", "Bangladesh", "Russian Federation", "Mexico", "Ethiopia", "Japan"
  ];

  const countryCodes = {
    "India": "in",
    "China": "cn",
    "United States": "us",
    "Indonesia": "id",
    "Nigeria": "ng",
    "Brazil": "br",
    "Bangladesh": "bd",
    "Russian Federation": "ru",
    "Mexico": "mx",
    "Ethiopia": "et",
    "Japan": "jp"
  };

  const [total, age0_14, age15_64, age65] = await Promise.all([
    d3.csv("./data/population_total.csv", d3.autoType),
    d3.csv("./data/population_total_0-14.csv", d3.autoType),
    d3.csv("./data/population_total_15-64.csv", d3.autoType),
    d3.csv("./data/population_total_65_n_above.csv", d3.autoType)
  ]);

  const combinedData = total
    .filter(d => selectedCountries.includes(d["Country Name"]))
    .map(d => {
      const country = d["Country Name"];
      const pop0_14 = age0_14.find(x => x["Country Name"] === country)?.[2023] || 0;
      const pop15_64 = age15_64.find(x => x["Country Name"] === country)?.[2023] || 0;
      const pop65 = age65.find(x => x["Country Name"] === country)?.[2023] || 0;
      const totalPop = pop0_14 + pop15_64 + pop65;

      return {
        country,
        "0-14": pop0_14,
        "15-64": pop15_64,
        "65+": pop65,
        total: totalPop
      };
    });

  const ageGroups = ["0-14", "15-64", "65+"];

  const x = d3.scaleBand()
    .domain(combinedData.map(d => d.country))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(combinedData, d => d.total)]).nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(ageGroups)
    .range(["#6baed6", "#74c476", "#fd8d3c"]);

  const miniBarWidth = x.bandwidth() / 4;

  // Transparent Total Bars
  svg.selectAll(".total-bar")
    .data(combinedData)
    .enter()
    .append("rect")
    .attr("class", "total-bar")
    .attr("x", d => x(d.country))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.total))
    .attr("height", d => height - y(d.total))
    .attr("fill", "none")
    .attr("stroke", "#aaa")
    .attr("stroke-width", 2)
    .attr("rx", 8)
    .attr("ry", 8)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("stroke", "white")
        .attr("stroke-width", 3);

      tooltip
        .html(`<strong>${d.country}</strong><br><span style="font-size:13px;">Total Population: ${d3.format(",")(d.total)}</span>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
        .transition()
        .duration(300)
        .style("opacity", 1)
        .style("display", "block");
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("stroke", "#aaa")
        .attr("stroke-width", 2);

      tooltip
        .transition()
        .duration(300)
        .style("opacity", 0)
        .on("end", () => tooltip.style("display", "none"));
    });

  // Mini bars inside total bars
  svg.selectAll(".country-group")
    .data(combinedData)
    .enter()
    .append("g")
    .attr("transform", d => `translate(${x(d.country)},0)`)
    .selectAll(".mini-bar")
    .data(d => ageGroups.map(key => ({ key, value: d[key], total: d.total, country: d.country })))
    .enter()
    .append("rect")
    .attr("x", (d, i) => (x.bandwidth() / 2) - (1.5 * miniBarWidth) + (i * miniBarWidth))
    .attr("width", miniBarWidth)
    .attr("y", y(0))
    .attr("height", 0)
    .attr("fill", d => color(d.key))
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("fill", d3.color(color(d.key)).brighter(0.7));

      tooltip
        .html(`<strong>${d.country}</strong><br><span style="font-size:13px;">Age: ${d.key}<br>Population: ${d3.format(",")(d.value)}</span>`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
        .transition()
        .duration(300)
        .style("opacity", 1)
        .style("display", "block");
    })
    .on("mousemove", function(event) {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("fill", color(d.key));

      tooltip
        .transition()
        .duration(300)
        .style("opacity", 0)
        .on("end", () => tooltip.style("display", "none"));
    })
    .transition()
    .duration(1000)
    .delay((d, i) => i * 200)
    .attr("y", d => y(d.value))
    .attr("height", d => height - y(d.value));

  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height})`);

  const xLabels = xAxis.selectAll(".x-label")
    .data(combinedData)
    .enter()
    .append("g")
    .attr("class", "x-label")
    .attr("transform", d => `translate(${x(d.country) + x.bandwidth()/2}, 0)`);

  xLabels.append("image")
    .attr("xlink:href", d => `https://flagcdn.com/w40/${countryCodes[d.country]}.png`)
    .attr("width", 30)
    .attr("height", 22)
    .attr("y", 10)
    .attr("x", -15);

  xLabels.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 50)
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("fill", "white")
    .text(d => d.country.length > 10 ? d.country.split(' ')[0] : d.country);

  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d3.format(",")))
    .selectAll("text")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("fill", "white");


  const legend = svg.append("g")
    .attr("transform", `translate(${width - 220},0)`);

  ageGroups.forEach((group, i) => {
    legend.append("rect")
      .attr("x", 0)
      .attr("y", i * 30)
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", color(group));

    legend.append("text")
      .attr("x", 26)
      .attr("y", i * 30 + 14)
      .text(group)
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", "white");
  });
}


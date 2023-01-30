import { map, curveLinear, range, axisBottom, axisLeft, extent, line as d3line, max, create, scaleLinear, scaleSequential } from "d3";

//TODO not great to have this hardcoded this way
const separator = 100;

function getMaxX(freq) {
    return Math.max(500, freq + (100 - (freq % 100)));
}

function hideCoverageGraph(container) {
    // could also just hide, maybe
    const graph = container.querySelector('svg');
    const instructions = container.querySelector('p.instructions');
    container.removeChild(graph);
    container.removeChild(instructions);
}

function getCoverageIndex(frequency, indicesLength) {
    // Add one to cover the 0 index that gets added; ensure we don't overflow.
    return Math.min(1 + Math.round(frequency / 100), indicesLength - 1);
}

function renderCoverageGraph(datasetName, percentages, term, frequency, container) {
    let transformedPercentages = [];
    transformedPercentages.push({ x: 0, y: 0 });
    let start = 1;
    for (const point of percentages) {
        transformedPercentages.push({ x: start, y: point * 100 });
        if (start < separator) {
            start = separator;
        } else {
            start += separator;
        }
    }
    let chart = LineChart(transformedPercentages, {
        x: d => d.x,
        y: d => d.y,
        yLabel: "Percentage of words recognized",
        xLabel: "Number of words learned",
        xDomain: [0, getMaxX(frequency)],
        yDomain: [0, 100],
        width: container.offsetWidth,
        height: 350,
        color: 'rgba(177, 178, 225)',
        strokeWidth: 2.5
    });
    const coverage = transformedPercentages[getCoverageIndex(frequency, transformedPercentages.length)].y;
    renderExplanation(datasetName, term, coverage, container);
    container.appendChild(chart);
}

function renderExplanation(datasetName, term, coverage, container) {
    let explanationContainer = document.createElement('p');
    explanationContainer.classList.add('instructions', 'coverage-explanation');
    explanationContainer.innerText = `In ${datasetName}, if you learned each word in order of frequency up to "${term}", you'd know approximately ${coverage.toFixed(2)}% of all words.`;
    container.appendChild(explanationContainer);
}

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/line-chart
function LineChart(data, {
    x = ([x]) => x, // given d in data, returns the (temporal) x-value
    y = ([, y]) => y, // given d in data, returns the (quantitative) y-value
    defined, // for gaps in data
    curve = curveLinear, // method of interpolation between points
    marginTop = 20, // top margin, in pixels
    marginRight = 30, // right margin, in pixels
    marginBottom = 30, // bottom margin, in pixels
    marginLeft = 40, // left margin, in pixels
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    xType = scaleSequential, // the x-scale type
    xDomain, // [xmin, xmax]
    xLabel = "",
    xRange = [marginLeft, width - marginRight], // [left, right]
    yType = scaleLinear, // the y-scale type
    yDomain, // [ymin, ymax]
    yRange = [height - marginBottom, marginTop], // [bottom, top]
    yFormat, // a format specifier string for the y-axis
    yLabel, // a label for the y-axis
    color = "currentColor", // stroke color of line
    strokeLinecap = "round", // stroke line cap of the line
    strokeLinejoin = "round", // stroke line join of the line
    strokeWidth = 1.5, // stroke width of line, in pixels
    strokeOpacity = 1, // stroke opacity of line
} = {}) {
    // Compute values.
    const X = map(data, x);
    const Y = map(data, y);
    const I = range(X.length);
    if (defined === undefined) defined = (d, i) => !isNaN(X[i]) && !isNaN(Y[i]);
    const D = map(data, defined);

    // Compute default domains.
    if (xDomain === undefined) xDomain = extent(X);
    if (yDomain === undefined) yDomain = [0, max(Y)];

    // Construct scales and axes.
    const xScale = xType(xDomain, xRange);
    const yScale = yType(yDomain, yRange);
    const xAxis = axisBottom(xScale).ticks(width / 80).tickSizeOuter(0);
    const yAxis = axisLeft(yScale).ticks(height / 40, yFormat);

    // Construct a line generator.
    const line = d3line()
        .defined(i => D[i])
        .curve(curve)
        .x(i => xScale(X[i]))
        .y(i => yScale(Y[i]));

    const svg = create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis)
        .call(g => g.append("text")
            .attr("x", (width / 2) - marginLeft)
            .attr("y", 28)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text(xLabel));

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll(".tick line").clone()
            .attr("x2", width - marginLeft - marginRight)
            .attr("stroke-opacity", 0.1))
        .call(g => g.append("text")
            .attr("x", -marginLeft)
            .attr("y", 10)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text(yLabel));

    svg.append("path")
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", strokeWidth)
        .attr("stroke-linecap", strokeLinecap)
        .attr("stroke-linejoin", strokeLinejoin)
        .attr("stroke-opacity", strokeOpacity)
        .attr("d", line(I));

    return svg.node();
}

export { renderCoverageGraph, hideCoverageGraph }
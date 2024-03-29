import { sankey, sankeyLinkHorizontal, sankeyCenter, sankeyJustify, sankeyRight, sankeyLeft } from "d3-sankey";
import { map, schemeTableau10, union, scaleOrdinal, format as d3format, create } from "d3";
import { renderCollocation } from "./collocations";
import { datasetMetadata } from "./config";

const datasetSelect = document.getElementById('usage-diagram-dataset-selector');
const treeDetailList = document.getElementById('usage-diagram-detail-list');
const treeDetailContainer = document.getElementById('usage-diagram-detail-container');
//unlike for example sentences, collocations are most useful with the larger datasets, so tatoeba is last
const datasetPriorities = ['opensubs', 'commoncrawl', 'wiki', 'tatoeba'];

let treeRenderers = {};

function addToTrie(trie, collocation, count, term, maxDepth) {
    let words = collocation.split(' ');
    // Avoid clutter via this one simple trick
    if (words.length > maxDepth) {
        return maxDepth;
    }
    let i = 0;
    if (!trie[0]) {
        trie[0] = {};
        trie[0][term] = { edges: {}, collocations: new Set() };
    }
    for (i = 0; i < words.length; i++) {
        if (words[i] === term) {
            break;
        }
    }
    // TODO: combine these for loops
    // TODO are these counts right, especially for those edges distance 1 from the search term?
    for (let j = i + 1; j < words.length; j++) {
        if (!trie[j - i]) {
            trie[j - i] = {};
        }
        if (!trie[j - i][words[j]]) {
            trie[j - i][words[j]] = { edges: {}, collocations: new Set() };
        }
        trie[j - i][words[j]].collocations.add(collocation);
        if (!trie[j - i - 1][words[j - 1]].edges[words[j]]) {
            trie[j - i - 1][words[j - 1]].edges[words[j]] = 0;
        }
        let currentCount = trie[j - i - 1][words[j - 1]].edges[words[j]];
        trie[j - i - 1][words[j - 1]].edges[words[j]] = Math.max(count, currentCount);//+=count;
        trie[j - i - 1][words[j - 1]].collocations.add(collocation);
    }
    for (let j = i - 1; j >= 0; j--) {
        if (!trie[j - i]) {
            trie[j - i] = {};
        }
        if (!trie[j - i][words[j]]) {
            trie[j - i][words[j]] = { edges: {}, collocations: new Set() };
        }
        trie[j - i][words[j]].collocations.add(collocation);
        if (!trie[j - i][words[j]].edges[words[j + 1]]) {
            trie[j - i][words[j]].edges[words[j + 1]] = 0;
        }
        let currentCount = trie[j - i][words[j]].edges[words[j + 1]] || 0;
        trie[j - i][words[j]].edges[words[j + 1]] = Math.max(count, currentCount);//+=count;
        trie[j - i][words[j]].collocations.add(collocation);
    }
    return -i;
}

function getDiagramElements(trie, rootDepth) {
    let elements = { nodes: [], edges: [], labels: {}, collocations: {} };
    let nonRoots = {};
    nonRoots[rootDepth] = new Set();
    for (let level = rootDepth; level in trie; level++) {
        const nodes = trie[level];
        for (const [node, data] of Object.entries(nodes)) {
            elements.nodes.push({
                id: `${node}-${level}`
            });
            elements.labels[`${node}-${level}`] = node;
            elements.collocations[`${node}-${level}`] = data.collocations;
            for (const edge of Object.keys(data.edges)) {
                if (!nonRoots[level + 1]) {
                    nonRoots[level + 1] = new Set();
                }
                nonRoots[level + 1].add(edge);
                elements.edges.push({
                    //id: `${node}-${level}-${edge}`,
                    source: `${node}-${level}`,
                    target: `${edge}-${parseInt(level) + 1}`,
                    value: data.edges[edge] //TODO switch to iterator on key/value pairs
                });
            }
        }
    }
    return elements;
}

function renderDetails(collocations, collocationHandler) {
    treeDetailContainer.removeAttribute('style');
    treeDetailList.innerHTML = '';
    for (const collocation of [...collocations].sort((a, b) => a.length - b.length)) {
        // it's kinda silly that `renderCollocation` takes an array but we have strings in this function
        renderCollocation(collocation.split(' '), treeDetailList, collocationHandler, false);
    }
    treeDetailList.scrollIntoView();
}

function getDepth(width) {
    // TODO: leaving this here for now. Possibly should be able to be modified via a preference or something.
    // clutter gets bad fast, however.
    return 3;
}

function getFontSize(width) {
    if (width >= 800) {
        return 16;
    }
    return 14;
}

function getHeight(height) {
    if (height >= 800) {
        return 400;
    }
    if (height >= 700) {
        return 350;
    }
    return 300;
}

function renderUsageDiagramForDataset(term, collocations, dataset, container, collocationHandler) {
    let trie = {};
    let rootDepth = 0;
    // Build what is effectively a level-order trie based on the collocations.
    // Level ordering ensures nodes are not confused in cases where the same word appears at multiple depths.
    // For example, `peut` needs nodes at two levels with these two collocations: 
    // peut parler
    // peut pas parler
    for (const [collocation, count] of Object.entries(collocations)) {
        rootDepth = Math.min(rootDepth, addToTrie(trie, collocation, count, term, getDepth(container.offsetWidth)));
    }
    // Once the trie is built, convert that to a set of nodes and edges, and render a sankey diagram.
    let elements = getDiagramElements(trie, rootDepth);
    treeRenderers[dataset] = function () {
        let chart = SankeyChart({
            nodes: elements.nodes,
            links: elements.edges
        }, {
            nodeGroup: d => d.id.split('-')[0],
            // TODO: not sure this can be done via CSS breakpoints given svg viewport, etc.?
            // should probably also have main be responsible for this instead of reading window directly
            width: Math.min(container.offsetWidth, 1000),
            height: getHeight(window.screen.availHeight),
            nodeLabel: d => elements.labels[d.id],
            nodeAlign: 'center',
            linkTitle: d => `${elements.labels[d.source.id]} ${elements.labels[d.target.id]}: ${d.value}`,
            linkClickHandler: (d, i) => renderDetails(elements.collocations[i.id], collocationHandler),
            fontColor: 'currentColor',
            fontSize: getFontSize(container.offsetWidth)
        });
        container.innerHTML = '';
        container.appendChild(chart);
    };
}
function renderUsageDiagram(term, collocations, container, collocationHandler) {
    treeDetailContainer.style.display = 'none';
    treeDetailList.innerHTML = '';
    datasetSelect.innerHTML = '';
    for (const dataset of datasetPriorities) {
        if (!collocations[dataset]) {
            continue;
        }
        let option = document.createElement('option');
        option.innerText = datasetMetadata[dataset].name;
        option.value = dataset;
        datasetSelect.appendChild(option);
        let collocationList = collocations[dataset];
        renderUsageDiagramForDataset(term, collocationList, dataset, container, collocationHandler);
    }
}

function renderUsageDiagramFallback(words, container, callback) {
    for (const word of words) {
        let item = document.createElement('li');
        item.classList.add('fallback');
        item.innerText = word;
        item.addEventListener('click', function (event) {
            callback(event.target.innerText);
        });
        container.appendChild(item);
    }
}

function tabSwitchCallback() {
    if (datasetSelect.value in treeRenderers) {
        treeRenderers[datasetSelect.value]();
    }
}

function initialize() {
    datasetSelect.addEventListener('change', function () {
        treeDetailContainer.style.display = 'none';
        treeDetailList.innerHTML = '';
        treeRenderers[datasetSelect.value]();
    });
}

//TODO: mostly copy/pasted from observable
// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/sankey-diagram
function SankeyChart({
    nodes, // an iterable of node objects (typically [{id}, …]); implied by links if missing
    links // an iterable of link objects (typically [{source, target}, …])
}, {
    format = ",", // a function or format specifier for values in titles
    align = "justify", // convenience shorthand for nodeAlign
    fontColor = 'black',
    fontSize = 16,
    nodeId = d => d.id, // given d in nodes, returns a unique identifier (string)
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeLabel, // given d in (computed) nodes, text to label the associated rect
    nodeTitle = _ => ``, // given d in (computed) nodes, hover text
    nodeAlign = align, // Sankey node alignment strategy: left, right, justify, center
    nodeWidth = 25, // width of node rects
    nodePadding = 10, // vertical separation between adjacent nodes
    nodeLabelPadding = 2, // horizontal separation between node and label
    nodeStroke = "currentColor", // stroke around node rects
    nodeStrokeWidth, // width of stroke around node rects, in pixels
    nodeStrokeOpacity, // opacity of stroke around node rects
    nodeStrokeLinejoin, // line join for stroke around node rects
    linkSource = ({ source }) => source, // given d in links, returns a node identifier string
    linkTarget = ({ target }) => target, // given d in links, returns a node identifier string
    linkValue = ({ value }) => value, // given d in links, returns the quantitative value
    linkPath = sankeyLinkHorizontal(), // given d in (computed) links, returns the SVG path
    linkTitle = d => `${d.source.id}  ${d.target.id}: ${d.value}`, // given d in (computed) links
    linkClickHandler = function (d, i) { },
    linkColor = "source-target", // source, target, source-target, or static color
    linkStrokeOpacity = 0.4, // link stroke opacity
    //linkMixBlendMode = "", // link blending mode, which some mobile browsers do not support on <svg>
    colors = schemeTableau10, // array of colors
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    marginTop = 5, // top margin, in pixels
    marginRight = 1, // right margin, in pixels
    marginBottom = 5, // bottom margin, in pixels
    marginLeft = 1, // left margin, in pixels
} = {}) {
    // Convert nodeAlign from a name to a function (since d3-sankey is not part of core d3).
    if (typeof nodeAlign !== "function") nodeAlign = {
        left: sankeyLeft,
        right: sankeyRight,
        center: sankeyCenter
    }[nodeAlign] ?? sankeyJustify;

    // Compute values.
    const LS = map(links, linkSource).map(intern);
    const LT = map(links, linkTarget).map(intern);
    const LV = map(links, linkValue);
    if (nodes === undefined) nodes = Array.from(union(LS, LT), id => ({ id }));
    const N = map(nodes, nodeId).map(intern);
    const G = nodeGroup == null ? null : map(nodes, nodeGroup).map(intern);

    // Replace the input nodes and links with mutable objects for the simulation.
    nodes = map(nodes, (_, i) => ({ id: N[i] }));
    links = map(links, (_, i) => ({ source: LS[i], target: LT[i], value: LV[i] }));

    // Ignore a group-based linkColor option if no groups are specified.
    if (!G && ["source", "target", "source-target"].includes(linkColor)) linkColor = "currentColor";

    // Compute default domains.
    if (G && nodeGroups === undefined) nodeGroups = G;

    // Construct the scales.
    const color = nodeGroup == null ? null : scaleOrdinal(nodeGroups, colors);

    // Compute the Sankey layout.
    sankey()
        .nodeId(({ index: i }) => N[i])
        .nodeAlign(nodeAlign)
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom]])
        ({ nodes, links });

    // Compute titles and labels using layout nodes, so as to access aggregate values.
    if (typeof format !== "function") format = d3format(format);
    const Tl = nodeLabel === undefined ? N : nodeLabel == null ? null : map(nodes, nodeLabel);
    const Tt = nodeTitle == null ? null : map(nodes, nodeTitle);
    const Lt = linkTitle == null ? null : map(links, linkTitle);

    // A unique identifier for clip paths (to avoid conflicts).
    const uid = `O-${Math.random().toString(16).slice(2)}`;

    const svg = create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

    const node = svg.append("g")
        .attr("stroke", nodeStroke)
        .attr("stroke-width", nodeStrokeWidth)
        .attr("stroke-opacity", nodeStrokeOpacity)
        .attr("stroke-linejoin", nodeStrokeLinejoin)
        .selectAll("rect")
        .data(nodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0);

    if (G) node.attr("fill", ({ index: i }) => color(G[i]));
    if (Tt) node.append("title").text(({ index: i }) => Tt[i]);

    const link = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", linkStrokeOpacity)
        .selectAll("g")
        .data(links)
        .join("g");
    //.style("mix-blend-mode", linkMixBlendMode);

    if (linkColor === "source-target") link.append("linearGradient")
        .attr("id", d => `${uid}-link-${d.index}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d => d.source.x1)
        .attr("x2", d => d.target.x0)
        .call(gradient => gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", ({ source: { index: i } }) => color(G[i])))
        .call(gradient => gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", ({ target: { index: i } }) => color(G[i])));

    link.append("path")
        .attr("d", linkPath)
        .attr("stroke", linkColor === "source-target" ? ({ index: i }) => `url(#${uid}-link-${i})`
            : linkColor === "source" ? ({ source: { index: i } }) => color(G[i])
                : linkColor === "target" ? ({ target: { index: i } }) => color(G[i])
                    : linkColor)
        .attr("stroke-width", ({ width }) => Math.max(1, width))
        .call(Lt ? path => path.append("title").text(({ index: i }) => Lt[i]) : () => { });

    if (Tl) svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-weight", "bold")
        .attr("fill", fontColor)
        .attr("font-size", fontSize)
        .attr("cursor", "pointer")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + nodeLabelPadding : d.x0 - nodeLabelPadding)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(({ index: i }) => Tl[i])
        .on('click', linkClickHandler);

    function intern(value) {
        return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    return Object.assign(svg.node(), { scales: { color } });
}

export { renderUsageDiagram, renderUsageDiagramFallback, tabSwitchCallback, initialize }
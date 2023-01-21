const lengthSelect = document.getElementById('collocations-length-selector');

function renderCollocation(collocation, container, collocationHandler, hide, counts) {
    let item = document.createElement('li');
    item.classList.add('collocation', `length-${collocation.length}`);
    let joinedText = collocation.join(' ');
    // TODO: silly hack to allow the lists and sankey graphs to use the same function...
    if (hide) {
        item.style.display = 'none';
    }
    item.addEventListener('click', function () {
        collocationHandler(joinedText);
    });
    // TODO: non-space delimited languages
    item.innerText = joinedText;
    if (counts) {
        if (counts.numDatasets > 1 && counts.total > 100) {
            item.classList.add('very-high-frequency');
        } else if (counts.numDatasets > 1) {
            item.classList.add('high-frequency');
        } else if (counts.numDatasets === 1 && counts.total < 5) {
            item.classList.add('low-frequency');
        }
    }
    container.appendChild(item);
}

function renderCollocationList(collocations, container, collocationHandler) {
    let collocationMap = {};
    Object.values(collocations).forEach(collocationsForDataset => {
        // prioritize based on those in multiple datasets
        // then based on counts
        Object.entries(collocationsForDataset).forEach(([collocation, count]) => {
            if (!(collocation in collocationMap)) {
                collocationMap[collocation] = { numDatasets: 0, total: 0 }
            }
            collocationMap[collocation].numDatasets++;
            collocationMap[collocation].total += count;
        });
    });
    lengthSelect.innerHTML = '';
    const fullList = document.createElement('ul');
    fullList.classList.add('collocation-list');
    //could use a boolean array, but this'll allow indeterminate collocation length
    let lengths = new Set();
    for (const item of Object.keys(collocationMap).sort((a, b) => {
        // TODO: entries or keys?
        if (collocationMap[a].numDatasets === collocationMap[b].numDatasets) {
            return collocationMap[b].total - collocationMap[a].total;
        }
        return collocationMap[b].numDatasets - collocationMap[a].numDatasets;
    })) {
        const words = item.split(' ');
        lengths.add(words.length);
        renderCollocation(words, fullList, collocationHandler, true, collocationMap[item]);
    }
    const min = [...lengths].sort()[0];
    const max = [...lengths].sort()[lengths.size - 1];
    lengthSelect.min = min;
    lengthSelect.max = max;
    lengthSelect.value = min;
    container.appendChild(fullList);
    for (const item of document.querySelectorAll(`.collocation.length-${lengthSelect.value}`)) {
        item.removeAttribute('style');
    }
}

function renderCollocationsFallback(words, container, callback) {
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

function initialize() {
    lengthSelect.addEventListener('input', function () {
        for (const item of document.querySelectorAll('.collocation')) {
            if (!item.classList.contains(`length-${lengthSelect.value}`)) {
                item.style.display = 'none';
            } else {
                item.removeAttribute('style');
            }
        }
    });
}

export { renderCollocationList, renderCollocation, renderCollocationsFallback, initialize }
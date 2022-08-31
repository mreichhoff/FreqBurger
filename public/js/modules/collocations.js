const lengthSelect = document.getElementById('collocations-length-selector');

function renderCollocation(collocation, container, collocationHandler) {
    let item = document.createElement('li');
    item.classList.add('collocation', `length-${collocation.length}`);
    let joinedText = collocation.join(' ');
    item.style.display = 'none';
    item.addEventListener('click', function () {
        collocationHandler(joinedText);
    });
    // TODO: non-space delimited languages
    item.innerText = joinedText;
    container.appendChild(item);
}

function renderCollocations(collocations, container, collocationHandler) {
    lengthSelect.innerHTML = '';
    const fullList = document.createElement('ul');
    fullList.classList.add('collocation-list');
    //could use a boolean array, but this'll allow indeterminate collocation length
    let lengths = new Set();
    for (const item of collocations) {
        const words = item.split(' ');
        lengths.add(words.length);
        renderCollocation(words, fullList, collocationHandler);
    }
    for (const length of [...lengths].sort()) {
        let option = document.createElement('option');
        option.innerText = length;
        option.value = length;
        lengthSelect.appendChild(option);
    }
    container.appendChild(fullList);
    for (const item of document.querySelectorAll(`.collocation.length-${lengthSelect.value}`)) {
        item.removeAttribute('style');
    }
}

function renderCollocationsFallback(words, container, callback) {
    for (const word of words) {
        let item = document.createElement('li');
        item.classList.add('collocation');
        item.innerText = word;
        item.addEventListener('click', function (event) {
            callback(event.target.innerText);
        });
        container.appendChild(item);
    }
}

function initialize() {
    lengthSelect.addEventListener('change', function () {
        for (const item of document.querySelectorAll('.collocation')) {
            if (!item.classList.contains(`length-${lengthSelect.value}`)) {
                item.style.display = 'none';
            } else {
                item.removeAttribute('style');
            }
        }
    })
}

export { renderCollocations, renderCollocationsFallback, initialize }
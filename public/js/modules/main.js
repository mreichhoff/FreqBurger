import { initialize as initializeFirebase } from "./firebase-init";
import { initialize as initializeDatalayer, setLanguages, getData, queryTypes } from "./data-layer";

initializeFirebase();
initializeDatalayer();

const queryForm = document.getElementById('query-form');
const searchBox = document.getElementById('search-box');
const searchLabel = document.getElementById('search-label');
const toggleCheckbox = document.getElementById('base-target-toggle');
const resultsContainer = document.getElementById('results-container');

const targetLanguageSelector = document.getElementById('target-language-selector');
const baseLanguageSelector = document.getElementById('base-language-selector');

let targetLanguage = 'French';
let baseLanguage = 'English';

const languageMetadata = {
    'French': {
        'key': 'fr'
    },
    'English': {
        'key': 'en'
    }
}

const datasetPriorities = ['tatoeba', 'commoncrawl', 'opensubs', 'wiki'];
//TODO: probably should get this on load
const datasetMetadata = {
    'tatoeba': {
        'name': 'Tatoeba',
        'description': 'A crowdsourced collection of translated sentences.',
        'attributionUrl': 'https://tatoeba.org'
    },
    'commoncrawl': {
        'name': 'CommonCrawl',
        'description': 'Multilingual website text from a web crawler.',
        'attributionUrl': 'https://opus.nlpl.eu/CCAligned.php'
    },
    'opensubs': {
        'name': 'OpenSubtitles',
        'description': 'Movie and TV subtitles with translations.',
        'attributionUrl': 'https://opus.nlpl.eu/OpenSubtitles2018.php'
    },
    'wiki': {
        'name': 'Wiki',
        'description': 'Wikipedia articles with translations.',
        'attributionUrl': 'https://opus.nlpl.eu/Wikipedia.php'
    }
};
function clean(token) {
    // TODO: why allow trailing but not leading numbers?
    // TODO: handle case sensitive languages
    // wow https://stackoverflow.com/questions/20690499/concrete-javascript-regular-expression-for-accented-characters-diacritics
    return token.toLowerCase().replace(/(^[^A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9]+$)/g, '');
}
function getOrderingSuffix(number) {
    // they ask me why i do it, because I can
    number = number % 10;
    return number === 1 ? 'st' : number === 2 ? 'nd' : number === 3 ? 'rd' : 'th';
}
function renderExampleText(term, tokens, queryType, container) {
    for (const token of tokens) {
        let anchor = document.createElement('a');
        anchor.classList.add('token');
        const cleanToken = clean(token);
        if (cleanToken === term) {
            // TODO: array expansion thing with classList.add
            anchor.classList.add('searched-term');
        }
        anchor.addEventListener('dblclick', function () {
            if (queryType === queryTypes.base) {
                toggleCheckbox.checked = true;
                toggleCheckbox.dispatchEvent(new Event('change'));
            } else {
                toggleCheckbox.checked = false;
                toggleCheckbox.dispatchEvent(new Event('change'));
            }
            searchBox.value = cleanToken;
            query(token, queryType);
        });
        // TODO: non-space-delimited languages
        anchor.innerText = token;
        container.appendChild(anchor);
        // YOU ARE IN NO POSITION TO JUDGE ME
        container.append(" ");
    }
}
function renderExample(term, example, container) {
    let targetContainer = document.createElement('p');
    targetContainer.classList.add('target', 'example-text');
    const targetTextTokens = example.target;
    renderExampleText(term, targetTextTokens, queryTypes.target, targetContainer);
    container.appendChild(targetContainer);

    let baseContainer = document.createElement('p');
    baseContainer.classList.add('base', 'example-text');
    const baseTextTokens = example.base;
    renderExampleText(term, baseTextTokens, queryTypes.base, baseContainer);
    container.appendChild(baseContainer);
}
function renderExamples(term, examples, container) {
    let exampleList = document.createElement('ul');
    exampleList.classList.add('example-list');
    for (const example of examples) {
        let itemContainer = document.createElement('li');
        itemContainer.classList.add('example');
        renderExample(term, example, itemContainer);
        exampleList.appendChild(itemContainer);
    }
    container.appendChild(exampleList);
}
function renderFreq(freq, term, metadata, container) {
    const frequencyContainer = document.createElement('div');
    frequencyContainer.classList.add('frequency-metadata');
    frequencyContainer.innerText = `${term} is the ${freq}${getOrderingSuffix(freq)} most common word in ${metadata['name']}`
    container.appendChild(frequencyContainer);
}
function renderDatasetMetadata(metadata, container) {
    const metadataContainer = document.createElement('div');
    metadataContainer.classList.add('dataset-metadata');
    metadataContainer.innerHTML = `<span class='dataset-description'>${metadata['description']}</span>&nbsp;<span class='dataset-attribution'>Accessed via <a href='${metadata['attributionUrl']}'>${metadata['attributionUrl']}</a></span>`;
    container.appendChild(metadataContainer);
}
function renderHeader(metadata, container) {
    const header = document.createElement('h2');
    header.classList.add('dataset-header');
    header.innerText = metadata['name'];
    container.appendChild(header);
}
function renderDataset(term, datasetId, results, container) {
    //TODO: probably should make client retrieve metadata from server instead of building it in
    const metadata = datasetMetadata[datasetId];
    renderHeader(metadata, container);
    renderDatasetMetadata(metadata, container);
    if (results.freq) {
        renderFreq(results.freq, term, metadata, container);
    }
    renderExamples(term, results.examples, container);
}
function renderData(term, data) {
    let value = {};
    for (const key of datasetPriorities) {
        if (!(key in data) || !data[key].examples) {
            // if there are no examples, bail out.
            continue;
        }
        value = data[key];
        let datasetContainer = document.createElement('div');
        datasetContainer.classList.add('dataset-results');
        renderDataset(term, key, value, datasetContainer);
        resultsContainer.appendChild(datasetContainer);
    }
}
function clearResults() {
    resultsContainer.innerHTML = '';
}
function query(term, queryType) {
    const cleanTerm = clean(term);
    const dataPromise = getData(cleanTerm, queryType);
    dataPromise.then(value => {
        if (value.exists()) {
            // with each query, clear out the old results
            clearResults();
            renderData(cleanTerm, value.data());
        } else {
            //TODO
        }
    });
}
queryForm.addEventListener('submit', function (event) {
    event.preventDefault();
    query(searchBox.value, toggleCheckbox.checked ? queryTypes.base : queryTypes.target);
});

toggleCheckbox.addEventListener('change', function () {
    if (toggleCheckbox.checked) {
        searchLabel.innerText = `Find ${targetLanguage} sentences whose translation has the ${baseLanguage} word:`;
    } else {
        searchLabel.innerText = `Find ${targetLanguage} sentences with the ${targetLanguage} word:`;
    }
});
function languageChangeHandler() {
    setLanguages(languageMetadata[baseLanguageSelector.value]['key'], languageMetadata[targetLanguageSelector.value]['key']);
    // When switching languages, clear out any existing results.
    clearResults();
}
targetLanguageSelector.addEventListener('change', languageChangeHandler);
baseLanguageSelector.addEventListener('change', languageChangeHandler);
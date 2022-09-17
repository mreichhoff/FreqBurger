import { initialize as initializeFirebase } from "./firebase-init";
import { initialize as initializeDatalayer, setLanguages, getExampleData, getDefinitions, getAutocomplete, queryTypes } from "./data-layer";
import { renderDefinitions } from "./definitions";
import { renderCollocations, renderCollocationsFallback, initialize as initializeCollocations } from "./collocations";
import { initialize as initializeStudyMode, renderAddCardForm, setupStudyMode, teardownStudyMode, setExportVisibility } from "./study-mode";
import { clean, cleanTypes } from "./utils";

const DEFAULT_BASE_LANGUAGE = 'english';

initializeFirebase();
initializeDatalayer();
initializeCollocations();
initializeStudyMode();

const queryForm = document.getElementById('query-form');
const searchBox = document.getElementById('search-box');
const searchLabel = document.getElementById('search-label');
const toggleCheckbox = document.getElementById('base-target-toggle');

const collocationListContainer = document.getElementById('collocation-list-container');
const collocationsPrimary = document.getElementById('collocations-primary');
const collocationsFallback = document.getElementById('collocations-fallback');
const collocationsFallbackList = document.getElementById('collocations-fallback-list');
const collocationsBaseFallback = document.getElementById('base-collocations-message');

const resultsContainer = document.getElementById('results-container');
const examplesContainer = document.getElementById('examples-container');
const collocationsContainer = document.getElementById('collocations-container');
const definitionsContainer = document.getElementById('definitions-container');
const definitionsResultContainer = document.getElementById('definitions-result-container');
const definitionsFallback = document.getElementById('definitions-fallback');

const resultsTypesContainer = document.getElementById('result-types-container');

const targetLanguageSelector = document.getElementById('target-language-selector');
const baseLanguageSelector = document.getElementById('base-language-selector');

const resultsTab = document.getElementById('examples-tab');
const definitionsTab = document.getElementById('definitions-tab');
const collocationsTab = document.getElementById('collocations-tab');

const suggestionContainer = document.getElementById('autocomplete');

const modeIcon = document.getElementById('mode-icon');
const menuIcon = document.getElementById('menu-icon');

const mainContainer = document.getElementById('main-container');
const studyContainer = document.getElementById('study-container');
const menuContainer = document.getElementById('menu-container');

const startupContainer = document.getElementById('startup-container');
const examplesFallback = document.getElementById("examples-fallback");

// ordering is important
const tabs = [
    { tab: resultsTab, container: examplesContainer },
    { tab: definitionsTab, container: definitionsContainer },
    { tab: collocationsTab, container: collocationsContainer }
];

let targetLanguage = 'French';
let baseLanguage = 'English';

const languageMetadata = {
    'french': {
        'key': 'fr',
        'tts': ['fr-FR', 'fr_FR']
    },
    'english': {
        'key': 'en'
    }
};

const datasetPriorities = ['tatoeba', 'opensubs', 'commoncrawl', 'wiki'];
//TODO: probably should get this on load
const datasetMetadata = {
    'tatoeba': {
        'name': 'Tatoeba',
        'description': 'A crowdsourced collection of translated sentences. Mostly colloquial, often geared towards learners.',
        'attributionUrl': 'https://tatoeba.org',
        'attributionSiteName': 'Tatoeba'
    },
    'commoncrawl': {
        'name': 'CommonCrawl',
        'description': 'Multilingual website text from a web crawler. Often formal, like marketing text or terms of use.',
        'attributionUrl': 'https://opus.nlpl.eu/CCAligned.php',
        'attributionSiteName': 'Opus'
    },
    'opensubs': {
        'name': 'OpenSubtitles',
        'description': 'Movie and TV subtitles with translations. Usually colloquial.',
        'attributionUrl': 'https://opus.nlpl.eu/OpenSubtitles2018.php',
        'attributionSiteName': 'Opus'
    },
    'wiki': {
        'name': 'Wiki',
        'description': 'Wikipedia articles with translations. Often formal.',
        'attributionUrl': 'https://opus.nlpl.eu/Wikipedia.php',
        'attributionSiteName': 'Opus'
    }
};

function clearDefinitions() {
    definitionsResultContainer.innerHTML = '';
}
function getOrderingSuffix(number) {
    // they ask me why i do it, because I can
    if (number % 100 === 11 || number % 100 === 12 || number % 100 === 13) {
        return 'th';
    }
    number = number % 10;
    return number === 1 ? 'st' : number === 2 ? 'nd' : number === 3 ? 'rd' : 'th';
}
function renderExampleText(term, tokens, queryType, container) {
    for (const token of tokens) {
        let anchor = document.createElement('a');
        anchor.classList.add('token');
        const cleanToken = clean(token, cleanTypes.examples);
        if (cleanToken === term) {
            // TODO: array expansion thing with classList.add
            anchor.classList.add('searched-term');
        }
        anchor.addEventListener('click', function (event) {
            event.preventDefault();
            if (queryType === queryTypes.base) {
                toggleCheckbox.checked = true;
                toggleCheckbox.dispatchEvent(new Event('change'));
            } else {
                toggleCheckbox.checked = false;
                toggleCheckbox.dispatchEvent(new Event('change'));
            }
            searchBox.value = cleanToken;
            query(token, queryType, true);
        });
        // TODO: non-space-delimited languages
        anchor.innerText = token;
        container.appendChild(anchor);
        // YOU ARE IN NO POSITION TO JUDGE ME
        container.append(" ");
    }
}
function renderTextToSpeech(text, container) {
    let listenContainer = document.createElement('li');
    listenContainer.classList.add('example-option', 'tts');
    listenContainer.innerText = 'Say this sentence';
    let button = document.createElement('i');
    button.classList.add('volume');
    listenContainer.appendChild(button);
    listenContainer.addEventListener('click', function () {
        const ttsKeys = languageMetadata[targetLanguageSelector.value].tts;
        let voice = speechSynthesis.getVoices().find(voice => ttsKeys.indexOf(voice.lang) > -1);
        if (!voice) {
            return;
        }
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voice.lang;
        utterance.voice = voice;
        speechSynthesis.speak(utterance);
    });
    container.appendChild(listenContainer);
}

function renderExample(term, example, container) {
    let targetContainer = document.createElement('p');
    targetContainer.classList.add('target', 'example-text');
    const targetTextTokens = example.target;
    renderExampleText(term, targetTextTokens, queryTypes.target, targetContainer);
    container.appendChild(targetContainer);

    let moreOptionsContainer = document.createElement('p');
    let optionsContainer = document.createElement('ul');
    moreOptionsContainer.classList.add('options-toggle', 'more-options');
    moreOptionsContainer.innerText = '+';
    moreOptionsContainer.addEventListener('click', function () {
        if (optionsContainer.style.display === 'none') {
            renderTextToSpeech(example.target.join(' '), optionsContainer);
            renderAddCardForm(term, example, optionsContainer);
            optionsContainer.removeAttribute('style');
            moreOptionsContainer.innerText = '—';
            moreOptionsContainer.classList.remove('more-options');
            moreOptionsContainer.classList.add('less-options');
        } else {
            moreOptionsContainer.innerText = '+';
            moreOptionsContainer.classList.remove('less-options');
            moreOptionsContainer.classList.add('more-options');
            optionsContainer.style.display = 'none';
            optionsContainer.innerHTML = '';
        }
    });
    container.appendChild(moreOptionsContainer);

    let baseContainer = document.createElement('p');
    baseContainer.classList.add('base', 'example-text');
    const baseTextTokens = example.base;
    renderExampleText(term, baseTextTokens, queryTypes.base, baseContainer);
    container.appendChild(baseContainer);

    optionsContainer.classList.add('option-list');
    optionsContainer.style.display = 'none';
    container.appendChild(optionsContainer);
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
    metadataContainer.innerHTML = `<span class='dataset-description'>${metadata['description']}</span>&nbsp;<span class='dataset-attribution'>Accessed via <a href='${metadata['attributionUrl']}'>${metadata['attributionSiteName']}.</a></span>`;
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
    collocationListContainer.innerHTML = '';
    let collocations = new Set();
    for (const key of datasetPriorities) {
        if (!(key in data) || !data[key].examples) {
            // if there are no examples, bail out.
            // there won't be collocations either in that case.
            continue;
        }
        value = data[key];
        let datasetContainer = document.createElement('div');
        datasetContainer.classList.add('dataset-results');
        renderDataset(term, key, value, datasetContainer);
        resultsContainer.appendChild(datasetContainer);

        if (!data[key].collocations) {
            continue;
        }
        Object.keys(data[key].collocations).forEach(x => collocations.add(x));
    }
    renderCollocations(collocations, collocationListContainer, function (searchTerm) {
        searchBox.value = searchTerm;
        query(searchTerm, queryTypes.target, true).then(x => {
            switchToTab(tabs[0].tab.id);
        });
    });
    //TODO there must be a better way, please no
    collocationsPrimary.style.display = 'none';
    collocationsFallback.style.display = 'none';
    collocationsBaseFallback.style.display = 'none';
    if (data.words && collocations.size === 0) {
        collocationsFallbackList.innerHTML = '';
        renderCollocationsFallback(data.words, collocationsFallbackList, function (word) {
            searchBox.value = word;
            query(word, queryTypes.target, true);
        });
        collocationsFallback.removeAttribute('style');
    } else if (collocations.size === 0) {
        collocationsBaseFallback.removeAttribute('style');
    } else {
        collocationsPrimary.removeAttribute('style');
    }
}
function clearResults() {
    examplesFallback.style.display = 'none';
    resultsContainer.innerHTML = '';
}

function query(term, queryType, shouldPushState) {
    //ensure the parent container is shown
    startupContainer.style.display = 'none';
    resultsTypesContainer.removeAttribute('style');
    clearSuggestions();

    const cleanTerm = clean(term, cleanTypes.examples);
    const dataPromise = getExampleData(cleanTerm, queryType);
    const termForDefinitions = clean(term, cleanTypes.definitions);
    const definitionPromise = getDefinitions(termForDefinitions);

    return Promise.all([dataPromise.then(value => {
        if (value.exists()) {
            // with each query, clear out the old results
            clearResults();
            renderData(cleanTerm, value.data());
            let newUrl = `/${targetLanguageSelector.value}/${cleanTerm}`;
            let newQueryString = [];
            if (baseLanguageSelector.value !== DEFAULT_BASE_LANGUAGE) {
                newQueryString.push(`base=${baseLanguageSelector.value}`);
            }
            if (queryType != queryTypes.target) {
                newQueryString.push(`queryType=${queryType}`);
            }
            if (newQueryString.length !== 0) {
                newUrl += '?';
                for (let i = 0; i < newQueryString.length - 1; i++) {
                    newUrl += `${newQueryString[i]}&`;
                }
                newUrl += newQueryString[newQueryString.length - 1];
            }
            if (shouldPushState) {
                history.pushState({
                    term: term,
                    queryType: queryType,
                    languages: {
                        base: baseLanguageSelector.value,
                        target: targetLanguageSelector.value
                    }
                }, '', newUrl);
            }
        } else {
            examplesFallback.removeAttribute('style');
        }
    }).catch(x => {
        //TODO
    }),
    // TODO: just combine with sentences into a single doc per word
    definitionPromise.then(value => {
        clearDefinitions();
        definitionsFallback.style.display = 'none';
        if (value.exists()) {

            renderDefinitions(termForDefinitions, value.data(), definitionsResultContainer, function (reference) {
                searchBox.value = reference;
                query(reference, queryTypes.target, true);
            });
        } else {
            //TODO: specific messaging
            definitionsFallback.removeAttribute('style');
        }
    }).catch(x => {
        // todo
    })]);
}
queryForm.addEventListener('submit', function (event) {
    event.preventDefault();
    searchBox.blur();
    if (!searchBox.value) {
        return;
    }
    query(searchBox.value, toggleCheckbox.checked ? queryTypes.base : queryTypes.target, true).then(x => {
        switchToTab(tabs[0].tab.id);
    });
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

function loadState(state) {
    targetLanguageSelector.value = state.languages.target;
    baseLanguageSelector.value = state.languages.base;
    targetLanguageSelector.dispatchEvent(new Event('change'));
    baseLanguageSelector.dispatchEvent(new Event('change'));
    const term = decodeURIComponent(state.term);
    searchBox.value = term;
    if (state.queryType === queryTypes.base) {
        toggleCheckbox.checked = true;
        toggleCheckbox.dispatchEvent(new Event('change'));
    } else {
        toggleCheckbox.checked = false;
        toggleCheckbox.dispatchEvent(new Event('change'));
    }
    query(term, state.queryType, false);
}

function parseUrl(path) {
    if (path[0] === '/') {
        path = path.substring(1);
    }
    const segments = path.split('/');
    if (segments.length !== 2) {
        return null;
    }
    const targetLanguage = segments[0];
    const term = segments[1];
    return {
        languages: {
            base: DEFAULT_BASE_LANGUAGE,
            target: targetLanguage
        },
        term: term,
        queryType: queryTypes.target
    };
}

if (history.state) {
    loadState(history.state);
} else if (document.location.pathname !== '/') {
    let state = parseUrl(document.location.pathname);
    if (state) {
        const urlParams = new URLSearchParams(window.location.search);
        state.queryType = urlParams.get('queryType') || queryTypes.target;
        state.languages.base = urlParams.get('base') || DEFAULT_BASE_LANGUAGE;
        loadState(state);
        history.pushState(state, '', document.location);
    }
} else {
    startupContainer.removeAttribute('style');
}

window.onpopstate = (event) => {
    const state = event.state;
    if (!state) {
        searchBox.value = '';
        clearResults();
        clearDefinitions();
        resultsTypesContainer.style.display = 'none';
        return;
    }
    loadState(state);
}

function switchToTab(id) {
    for (const entry of tabs) {
        if (entry.tab.id === id) {
            entry.tab.classList.add('active');
            entry.container.removeAttribute('style');
        } else {
            entry.tab.classList.remove('active');
            entry.container.style.display = 'none';
        }
    }
}

function clearSuggestions() {
    suggestionContainer.innerHTML = '';
    suggestionContainer.style.display = 'none';
}

function renderAutocomplete(data, container) {
    for (const word of data.words) {
        let suggestion = document.createElement('li');
        suggestion.classList.add('search-suggestion');
        suggestion.innerText = word;
        container.appendChild(suggestion);
        suggestion.addEventListener('mousedown', function () {
            searchBox.value = word;
            query(word, queryTypes.target, true);
        });
    }
}

searchBox.addEventListener('blur', function () {
    clearSuggestions();
});

searchBox.addEventListener('input', function () {
    if (toggleCheckbox.checked || !searchBox.value) {
        clearSuggestions();
        return false;
    }
    let currentPrefix = searchBox.value;
    getAutocomplete(clean(searchBox.value, cleanTypes.examples)).then(value => {
        if (searchBox.value !== currentPrefix || document.activeElement !== searchBox) {
            // this could be a late return of an old promise; just leave it
            return false;
        }
        clearSuggestions();
        if (value.exists()) {
            suggestionContainer.removeAttribute('style');
            renderAutocomplete(value.data(), suggestionContainer);
        }
    })
});

for (const entry of tabs) {
    entry.tab.addEventListener('click', function (event) {
        switchToTab(event.target.id)
    });
}

modeIcon.addEventListener('click', function () {
    if (studyContainer.style.display === 'none') {
        mainContainer.style.display = 'none';
        menuContainer.style.display = 'none';
        setupStudyMode();
        modeIcon.classList.remove('study');
        modeIcon.classList.add('search');
        studyContainer.removeAttribute('style');
    } else {
        studyContainer.style.display = 'none';
        menuContainer.style.display = 'none';
        teardownStudyMode();
        modeIcon.classList.remove('search');
        modeIcon.classList.add('study');
        mainContainer.removeAttribute('style');
    }
});

menuIcon.addEventListener('click', function () {
    if (menuContainer.style.display === 'none') {
        mainContainer.style.display = 'none';
        studyContainer.style.display = 'none';
        setExportVisibility();
        menuContainer.removeAttribute('style');
    } else {
        menuContainer.style.display = 'none';
        mainContainer.removeAttribute('style');
    }
});
import { initialize as initializeFirebase } from "./firebase-init";
import { initialize as initializeDatalayer, setLanguages, getExampleData, getAutocomplete, queryTypes } from "./data-layer";
import { renderDefinitions, renderDefinitionsFallback } from "./definitions";
import { renderCollocationList, renderCollocationsFallback, initialize as initializeCollocations } from "./collocations";
import { renderUsageDiagram, renderUsageDiagramFallback, tabSwitchCallback as diagramShownCallback, initialize as initializeUsageDiagrams } from "./usage-diagram";
import { initialize as initializeStudyMode, renderAddCardForm, setupStudyMode, teardownStudyMode, setExportVisibility } from "./study-mode";
import { clean, cleanTypes } from "./utils";

const DEFAULT_BASE_LANGUAGE = 'english';

initializeFirebase();
initializeDatalayer();
initializeCollocations();
initializeUsageDiagrams();
initializeStudyMode();

const queryForm = document.getElementById('query-form');
const searchBox = document.getElementById('search-box');
const searchLabel = document.getElementById('search-label');
const toggleCheckbox = document.getElementById('base-target-toggle');

const collocationListContainer = document.getElementById('collocation-list-container');
const usageDiagramContainer = document.getElementById('usage-diagram-container');
const collocationsPrimary = document.getElementById('collocations-primary');
const usageDiagramsPrimary = document.getElementById('usage-diagrams-primary');
const collocationsFallback = document.getElementById('collocations-fallback');
const usageDiagramFallback = document.getElementById('usage-diagram-fallback');
const collocationsFallbackList = document.getElementById('collocations-fallback-list');
const usageDiagramFallbackList = document.getElementById('usage-diagram-fallback-list');
const definitionsFallbackList = document.getElementById('definitions-fallback-list');

const collocationsBaseFallback = document.getElementById('base-collocations-message');
const usageDiagramBaseFallback = document.getElementById('base-usage-diagram-message');
const definitionsBaseFallback = document.getElementById('base-definitions-message');

const resultsContainer = document.getElementById('results-container');
const examplesContainer = document.getElementById('examples-container');
const collocationsContainer = document.getElementById('collocations-container');
const usageDiagramsContainer = document.getElementById('usage-diagrams-container');
const definitionsContainer = document.getElementById('definitions-container');
const definitionsResultContainer = document.getElementById('definitions-result-container');
const definitionsFallback = document.getElementById('definitions-fallback');

const resultsTypesContainer = document.getElementById('result-types-container');

const targetLanguageSelector = document.getElementById('target-language-selector');
const baseLanguageSelector = document.getElementById('base-language-selector');

const resultsTab = document.getElementById('examples-tab');
const definitionsTab = document.getElementById('definitions-tab');
const collocationsTab = document.getElementById('collocations-tab');
const usageDiagramsTab = document.getElementById('usage-diagrams-tab');

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
    { tab: resultsTab, container: examplesContainer, callback: () => { } },
    { tab: definitionsTab, container: definitionsContainer, callback: () => { } },
    { tab: collocationsTab, container: collocationsContainer, callback: () => { } },
    { tab: usageDiagramsTab, container: usageDiagramsContainer, callback: diagramShownCallback },
];

const languageMetadata = {
    'french': {
        'key': 'fr',
        'tts': {
            // include both locale formats because of seemingly off-spec behavior on android
            locales: ['fr-FR', 'fr_FR'],
            // include preferred names because of a recent iOS update having odd voices
            preferredName: 'Thomas'
        },
        'label': 'French'
    },
    'spanish': {
        'key': 'es',
        'tts': {
            locales: ['es-ES', 'es_ES'],
            preferredName: 'Mónica'
        },
        'label': 'Spanish'
    },
    'italian': {
        'key': 'it',
        'tts': {
            locales: ['it-IT', 'it_IT'],
            preferredName: 'Alice'
        },
        'label': 'Italian'
    },
    'german': {
        'key': 'de',
        'tts': {
            locales: ['de-DE', 'de_DE'],
            preferredName: 'Anna'
        },
        'label': 'German',
        'noLowering': true
    },
    'chinese': {
        'key': 'zh',
        'tts': {
            locales: ['zh-CN', 'zh_CN'],
            preferredName: 'Tingting'
        },
        'label': 'Chinese',
        'noSpaces': true
    },
    'japanese': {
        'key': 'ja',
        'tts': {
            locales: ['ja-JP', 'ja_JP'],
            preferredName: 'Kyoko'
        },
        'label': 'Japanese',
        'noSpaces': true
    },
    'english': {
        'key': 'en',
        'label': 'English'
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

// voice loading is just weird, and different per browser...
let voices = speechSynthesis.getVoices();
speechSynthesis.onvoiceschanged = function () {
    voices = speechSynthesis.getVoices();
};

// hacking around garbage collection issues...
window.activeUtterances = [];

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
    let currentIndex = 0;
    let anchors = [];
    for (const token of tokens) {
        let anchor = document.createElement('a');
        anchor.classList.add('token');
        anchor.classList.add(getQueryLanguage(queryType));
        const cleanToken = clean(token, cleanTypes.examples, getQueryLanguage(queryType));
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
            if (resultsTypesContainer.getBoundingClientRect().top < 0) {
                resultsTypesContainer.scrollIntoView();
            }
        });
        // TODO: non-space-delimited languages
        anchor.innerText = token;
        container.appendChild(anchor);
        // YOU ARE IN NO POSITION TO JUDGE ME
        if (!getSpaceSetting(queryType)) {
            container.append(" ");
        }
        anchors.push({
            start: currentIndex,
            end: currentIndex + token.length,
            element: anchor
        });
        currentIndex += token.length;
        currentIndex += getSpaceSetting(queryType) ? 0 : 1;
    }
    return anchors;
}
function findVoice(voices, options) {
    return voices.find(voice => options.locales.indexOf(voice.lang) > -1 && voice.name === options.preferredName) || voices.find(voice => options.locales.indexOf(voice.lang) > -1);
}
function renderTextToSpeech(text, container, anchors) {
    let listenContainer = document.createElement('li');
    listenContainer.classList.add('example-option', 'tts');
    listenContainer.innerText = 'Say this sentence';
    let button = document.createElement('i');
    button.classList.add('volume');
    listenContainer.appendChild(button);
    listenContainer.addEventListener('click', function () {
        const ttsKeys = languageMetadata[targetLanguageSelector.value].tts;
        //TODO: we're gonna have to do fallbacks, because at least macos has wacky ones
        let availableVoices = voices || speechSynthesis.getVoices();
        let voice = findVoice(availableVoices, ttsKeys);
        if (!voice) {
            return;
        }
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voice.lang;
        utterance.voice = voice;
        activeUtterances.push(utterance);
        utterance.addEventListener('boundary', function (event) {
            if (event.charIndex == null || event.charLength == null) {
                return false;
            }
            anchors.forEach(anchor => {
                if (anchor.start >= event.charIndex && anchor.end <= (event.charIndex + (event.charLength || 1))) {
                    anchor.element.style.backgroundColor = '#6de200';
                } else {
                    anchor.element.removeAttribute('style');
                }
            });
        });
        utterance.addEventListener('end', function () {
            anchors.forEach(anchor => {
                anchor.element.removeAttribute('style');
            });
            // length check shouldn't be necessary, but just in case, I guess?
            if (activeUtterances.length !== 0) {
                activeUtterances.shift();
            }
        });

        speechSynthesis.speak(utterance);
    });
    container.appendChild(listenContainer);
}

function renderExample(term, example, container) {
    let targetContainer = document.createElement('p');
    targetContainer.classList.add('target', 'example-text');
    const targetTextTokens = example.target;
    let anchors = renderExampleText(term, targetTextTokens, queryTypes.target, targetContainer);
    container.appendChild(targetContainer);

    let moreOptionsContainer = document.createElement('p');
    let optionsContainer = document.createElement('ul');
    moreOptionsContainer.classList.add('options-toggle', 'more-options');
    moreOptionsContainer.innerText = '+';
    moreOptionsContainer.addEventListener('click', function () {
        if (optionsContainer.style.display === 'none') {
            renderTextToSpeech(example.target.join(getSpaceSetting(queryTypes.target) ? '' : ' '), optionsContainer, anchors);
            renderAddCardForm(term, example, getQueryLanguage(queryTypes.target), optionsContainer);
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
    let collocations = {};
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
        collocations[key] = data[key].collocations;
    }
    let collocationQuery = function (searchTerm) {
        searchBox.value = searchTerm;
        query(searchTerm, queryTypes.target, true).then(x => {
            switchToTab(tabs[0].tab.id);
        });
    };
    //TODO there must be a better way, please no
    collocationsPrimary.style.display = 'none';
    usageDiagramsPrimary.style.display = 'none';
    collocationsFallback.style.display = 'none';
    usageDiagramFallback.style.display = 'none';
    collocationsBaseFallback.style.display = 'none';
    usageDiagramBaseFallback.style.display = 'none';
    if (data.words && !Object.keys(collocations).length) {
        collocationsFallbackList.innerHTML = '';
        renderCollocationsFallback(data.words, collocationsFallbackList, function (word) {
            searchBox.value = word;
            query(word, queryTypes.target, true);
        });
        usageDiagramFallbackList.innerHTML = '';
        renderUsageDiagramFallback(data.words, usageDiagramFallbackList, function (word) {
            searchBox.value = word;
            // we'll directly show the diagram in this case
            query(word, queryTypes.target, true).then(diagramShownCallback);
        });
        collocationsFallback.removeAttribute('style');
        usageDiagramFallback.removeAttribute('style');
    } else if (!Object.keys(collocations).length) {
        collocationsBaseFallback.removeAttribute('style');
        usageDiagramBaseFallback.removeAttribute('style');
    } else {
        collocationsPrimary.removeAttribute('style');
        usageDiagramsPrimary.removeAttribute('style');
        renderUsageDiagram(term, collocations, usageDiagramContainer, collocationQuery);
        renderCollocationList(collocations, collocationListContainer, collocationQuery);
    }
    clearDefinitions();
    definitionsFallback.style.display = 'none';
    definitionsBaseFallback.style.display = 'none';
    if (data.defs) {
        renderDefinitions(term, data.defs, definitionsResultContainer, function (reference) {
            searchBox.value = reference;
            query(reference, queryTypes.target, true);
        });
    } else if (data.words) {
        definitionsFallbackList.innerHTML = '';
        renderDefinitionsFallback(data.words, definitionsFallbackList, function (word) {
            searchBox.value = word;
            // we'll directly show the diagram in this case
            query(word, queryTypes.target, true);
        });
        definitionsFallback.removeAttribute('style');
    } else {
        //TODO: specific messaging
        definitionsBaseFallback.removeAttribute('style');
    }
}
function clearResults() {
    examplesFallback.style.display = 'none';
    resultsContainer.innerHTML = '';
}

function getQueryLanguage(queryType) {
    return queryType === queryTypes.target ? targetLanguageSelector.value : baseLanguageSelector.value;
}

function getSpaceSetting(queryType) {
    return languageMetadata[queryType === queryTypes.target ? targetLanguageSelector.value : baseLanguageSelector.value].noSpaces || false;
}

async function query(term, queryType, shouldPushState) {
    //ensure the parent container is shown
    startupContainer.style.display = 'none';
    resultsTypesContainer.removeAttribute('style');
    clearSuggestions();

    const cleanTerm = clean(term, cleanTypes.examples, getQueryLanguage(queryType));
    const dataPromise = getExampleData(cleanTerm, queryType);
    //TODO: whoops....
    //const termForDefinitions = clean(term, cleanTypes.definitions);

    const value = await dataPromise;
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

function setSearchInstructions() {
    const targetLanguage = languageMetadata[targetLanguageSelector.value].label;
    const baseLanguage = languageMetadata[baseLanguageSelector.value].label;
    if (toggleCheckbox.checked) {
        searchLabel.innerText = `Find ${targetLanguage} sentences whose translation has the ${baseLanguage} word:`;
    } else {
        searchLabel.innerText = `Find ${targetLanguage} sentences with the ${targetLanguage} word:`;
    }
}
toggleCheckbox.addEventListener('change', setSearchInstructions);
function languageChangeHandler() {
    setLanguages(languageMetadata[baseLanguageSelector.value]['key'], languageMetadata[targetLanguageSelector.value]['key']);
    // When switching languages, clear out any existing results.
    clearResults();
    setSearchInstructions();
}
targetLanguageSelector.addEventListener('change', languageChangeHandler);
baseLanguageSelector.addEventListener('change', languageChangeHandler);

function loadState(state) {
    targetLanguageSelector.value = state.languages.target;
    baseLanguageSelector.value = state.languages.base;
    targetLanguageSelector.dispatchEvent(new Event('change'));
    baseLanguageSelector.dispatchEvent(new Event('change'));
    setSearchInstructions();
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
            entry.callback();
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
            query(word, queryTypes.target, true).then(_ => {
                switchToTab(tabs[0].tab.id);
            });
        });
    }
}

searchBox.addEventListener('blur', function () {
    clearSuggestions();
});

searchBox.addEventListener('input', function () {
    const cleanedTerm = clean(searchBox.value, cleanTypes.examples, getQueryLanguage(queryTypes.target));
    if (toggleCheckbox.checked || !cleanedTerm) {
        clearSuggestions();
        return false;
    }
    let currentPrefix = searchBox.value;
    getAutocomplete(cleanedTerm).then(value => {
        if (searchBox.value !== currentPrefix || document.activeElement !== searchBox) {
            // this could be a late return of an old promise; just leave it
            return false;
        }
        clearSuggestions();
        if (value && value.exists()) {
            suggestionContainer.removeAttribute('style');
            renderAutocomplete(value.data(), suggestionContainer);
        }
    })
});

for (const entry of tabs) {
    entry.tab.addEventListener('click', function (event) {
        switchToTab(event.target.id);
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
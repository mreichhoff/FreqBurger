import { getFirestore, doc, getDoc } from "firebase/firestore";
import { clean, cleanTypes } from "./utils";

let studyList = {};
let indexedDbInstance = null;
let user = null;

const languagesToCollection = {
    'fr': {
        'en': {
            'examples': 'fr-en',
            'definitions': 'fr-en-defs',
            'autocomplete': 'fr-en-trie'
        }
    }
};

// to save space, we put only a language key on each card, then translate it here
const languageKeysToLanguages = {
    'fr-en': {
        base: 'English',
        target: 'French'
    }
}

const queryTypes = {
    base: 'base',
    target: 'target'
}

let collectionId = languagesToCollection['fr']['en'];
let firestore = null;

let setLanguages = function (base, target) {
    if (target in languagesToCollection && base in languagesToCollection[target]) {
        collectionId = languagesToCollection[target][base];
    }
};

let getExampleData = function (word, queryType) {
    const docRef = doc(firestore, collectionId.examples, `${word}-${queryType}`);

    return getDoc(docRef);
};

let getDefinitions = function (word) {
    const docRef = doc(firestore, collectionId.definitions, word);
    return getDoc(docRef);
};

let getAutocomplete = function (prefix) {
    const docRef = doc(firestore, collectionId.autocomplete, prefix);
    return getDoc(docRef);
};

let getUnknownWordCount = function (tokens) {
    // TODO: could precompute if performance becomes an issue
    let unseenTokens = new Set(tokens.map(x => clean(x, cleanTypes.examples)));
    for (const [key, value] of Object.entries(studyList)) {
        let targetTokens = value.target;
        for (const token of targetTokens) {
            unseenTokens.delete(clean(token, cleanTypes.examples));
        }
        if (unseenTokens.size === 0) {
            return 0;
        }
    }
    return unseenTokens.size;
};

const cardTypes = {
    recognition: 'recognition',
    recall: 'recall',
    cloze: 'cloze'
};

let getKey = function (term, targetTokens, cardType) {
    if (cardType === cardTypes.recognition || cardType === cardTypes.recall) {
        // for recognition and recall cards, don't allow duplicates even if added via a separate term
        return `${targetTokens.join('')}-${cardType}`;
    }
    // for cloze cards, one could have the same sentence with a different term being hidden
    return `${targetTokens.join('')}-${cardType}-${term}`;
};

let makeCard = function (term, example, cardType) {
    return {
        // data for rendering the card
        term: term,
        cardType: cardType,
        target: example.target,
        base: example.base,
        // data for SM2
        streak: 0,
        ease: 2.5,
        interval: 0,
        lastReviewTimestamp: Date.now(),
        // data to get overall percentage
        rightCount: 0,
        wrongCount: 0,
        languages: collectionId.examples,
        added: Date.now()
    };
};

let inStudyList = function (term, example, cardType) {
    const key = getKey(term, example.target, cardType);
    return key in studyList;
};

let persistCard = function (key, card) {
    if (!indexedDbInstance) {
        localStorage.setItem('studyList', JSON.stringify(studyList));
        return;
    }
    const transaction = indexedDbInstance.transaction(['studyList'], 'readwrite');
    const objectStore = transaction.objectStore('studyList');
    if (!card) {
        const deleteRequest = objectStore.delete(key);
        //TODO: error, success handling
        return;
    }
    const cardPersistRequest = objectStore.put(card, key);
    //TODO: error, success handling, or promisify
};

// always adds
let persistStudyResult = function (key, timestamp, result) {
    if (!indexedDbInstance) {
        // for now, just skip study result counting when indexeddb is unavailable
        return;
    }
    const transaction = indexedDbInstance.transaction(['studyResults'], 'readwrite');
    const objectStore = transaction.objectStore('studyResults');
    objectStore.add({ key, timestamp, result });
};

// TODO: promisify this?
let addCard = function (term, example, cardType) {
    let key = getKey(term, example.target, cardType);
    studyList[key] = makeCard(term, example, cardType);
    persistCard(key, studyList[key]);
};

let initialize = function () {
    firestore = getFirestore();
    const request = indexedDB.open("freqminer", 1);
    // TODO: some kind of notification that it's ready to prevent race conditions
    request.onerror = (_) => {
        console.log("falling back to localStorage");
        indexedDbInstance = null;
        if (localStorage.studyList) {
            studyList = JSON.parse(localStorage.studyList);
        }
    };
    request.onsuccess = (event) => {
        indexedDbInstance = event.target.result;
        const objectStore = indexedDbInstance.transaction(['studyList'], 'readwrite').objectStore('studyList');
        const request = objectStore.openCursor();
        request.onsuccess = function (event) {
            let cursor = event.target.result;
            if (cursor) {
                studyList[cursor.primaryKey] = cursor.value;
                cursor.continue();
            }
        };
    };
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // studylist keys are generated by the js and retrieved that way, with no indices necessary
        db.createObjectStore('studyList');
        // no separate key needed; just specify a timestamp, cardID, and result
        db.createObjectStore('studyResults', { autoIncrement: true });
        // keys are search terms
        db.createObjectStore('visited');
        indexedDbInstance = db;
    };
};

let getStudyList = function () {
    return studyList;
};

let studyListEmpty = function () {
    return Object.entries(studyList).length === 0;
};

let getCardsDue = function () {
    const now = Date.now()
    const next = Object.entries(studyList).filter(kvp => {
        return kvp[1].lastReviewTimestamp + (kvp[1].interval * 24 * 60 * 60 * 1000) <= now;
    }).sort((x, y) => {
        if (x[1].lastReviewTimestamp !== y[1].lastReviewTimestamp) {
            return x[1].lastReviewTimestamp - y[1].lastReviewTimestamp;
        }
        return x[0].localeCompare(y[0]);
    });
    if (!next || next.length === 0) {
        return null;
    }
    return {
        key: next[0][0],
        card: next[0][1],
        count: next.length
    };
};
const resultTypes = {
    correct: 'c',
    correctWithHint: 'h',
    incorrect: 'i'
}
let recordResult = function (key, result) {
    //TODO: what if card is not present? Just let it error out?
    let card = studyList[key];
    card.lastReviewTimestamp = Date.now();
    let score = result === resultTypes.correct ? 4 : result === resultTypes.correctWithHint ? 3 : 1;
    if (score >= 3) {
        if (card.streak === 0) {
            card.interval = 1;
        } else if (card.streak === 1) {
            card.interval = 3;
        } else {
            card.interval = Math.round(card.interval * card.ease);
        }
        card.streak++;
        card.rightCount++;
    } else {
        card.streak = 0;
        card.interval = 0;
        card.wrongCount++;
    }
    card.ease = Math.max((card.ease + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))), 1.3);
    persistCard(key, card);
    persistStudyResult(key, card.lastReviewTimestamp, result);
};

let getLanguagesFromLanguageKey = function (key) {
    return languageKeysToLanguages[key];
};

let removeFromStudyList = function (key) {
    delete studyList[key];
    persistCard(key);
};

// TODO: this file is too big. Split into study mode and explore mode
export {
    initialize,
    getExampleData,
    getDefinitions,
    setLanguages,
    getAutocomplete,
    getUnknownWordCount,
    addCard,
    inStudyList,
    getStudyList,
    studyListEmpty,
    getCardsDue,
    recordResult,
    getLanguagesFromLanguageKey,
    removeFromStudyList,
    queryTypes,
    resultTypes
};
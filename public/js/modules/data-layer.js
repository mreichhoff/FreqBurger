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
        wrongCount: 0
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
    const cardPersistRequest = objectStore.add(card, key);
    //TODO: error, success handling, or promisify
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
        db.createObjectStore('studyList');
        db.createObjectStore('studyResults');
        db.createObjectStore('visited');
        indexedDbInstance = db;
    };
};

let getStudyList = function () {
    return studyList;
}

export { initialize, getExampleData, getDefinitions, setLanguages, getAutocomplete, getUnknownWordCount, addCard, inStudyList, getStudyList, queryTypes };
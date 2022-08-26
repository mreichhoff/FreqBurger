import { getFirestore, doc, getDoc } from "firebase/firestore";

const languagesToCollection = {
    'fr': {
        'en': {
            'examples': 'fr-en',
            'definitions': 'fr-en-defs'
        }
    }
};

const queryTypes = {
    base: 'base',
    target: 'target'
}

let collectionId = languagesToCollection['fr']['en'];
let db = null;

let setLanguages = function (base, target) {
    if (target in languagesToCollection && base in languagesToCollection[target]) {
        collectionId = languagesToCollection[target][base];
    }
};

let getExampleData = function (word, queryType) {
    const docRef = doc(db, collectionId.examples, `${word}-${queryType}`);

    return getDoc(docRef);
};

let getDefinitions = function (word) {
    const docRef = doc(db, collectionId.definitions, word);
    return getDoc(docRef);
};

let initialize = function () {
    db = getFirestore();
};

export { initialize, getExampleData, getDefinitions, setLanguages, queryTypes };
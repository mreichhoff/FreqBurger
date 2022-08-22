import { getFirestore, doc, getDoc } from "firebase/firestore";

const languagesToCollection = {
    'fr': {
        'en': 'fr-en'
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

let getData = function (word, queryType) {
    const docRef = doc(db, collectionId, `${word}-${queryType}`);

    return getDoc(docRef);
};

let initialize = function () {
    db = getFirestore();
};

export { initialize, getData, setLanguages, queryTypes };
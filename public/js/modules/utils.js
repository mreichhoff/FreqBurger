const cleanTypes = {
    'definitions': 'definitions',
    'examples': 'examples'
}

const cleanSettings = {
    'german': {
        'noLowering': true
    },
    'chinese': {
        'noSpaces': true
    },
    'japanese': {
        'noSpaces': true
    }
};
function clean(token, cleanType, language) {
    if (!(language in cleanSettings) || !cleanSettings[language].noLowering) {
        token = token.toLowerCase();
    }
    if ((language in cleanSettings) && cleanSettings[language].noSpaces) {
        token = token.replace(/\s/g, "");
        // TODO: investigate regexes below being weird with chinese
        return token;
    }
    token = token.replace(/(^[^A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9]+$)/g, '');
    // smart quotes, whyyyyy
    token = token.replace(/[\u2018\u2019]/g, "'");
    token = token.replace(/[\u201C\u201D]/g, '"');
    if (cleanType === cleanTypes.definitions) {
        // TODO: language specificity, general hackiness
        return token.replace(/(^[djlmt]\')/, '');
    }

    // TODO: why allow trailing but not leading numbers?
    // TODO: handle case sensitive languages
    // wow https://stackoverflow.com/questions/20690499/concrete-javascript-regular-expression-for-accented-characters-diacritics
    return token;
}
export { clean, cleanTypes }
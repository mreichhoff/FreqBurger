const cleanTypes = {
    'definitions': 'definitions',
    'examples': 'examples'
}

function clean(token, cleanType) {
    token = token.toLowerCase().replace(/(^[^A-Za-zÀ-ÖØ-öø-ÿ]+)|([^A-Za-zÀ-ÖØ-öø-ÿ0-9]+$)/g, '');
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
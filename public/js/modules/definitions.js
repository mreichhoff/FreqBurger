function renderDefinitionWithReference(term, reference, definition, container, referenceHandler) {
    let anchor = document.createElement('a');
    anchor.classList.add('token');
    anchor.innerText = `(form of ${reference})`;
    anchor.addEventListener('click', function () {
        referenceHandler(reference);
    });
    let termSignifier = document.createElement('span');
    termSignifier.classList.add('definition', 'term');
    termSignifier.innerText = term;
    container.append(termSignifier);
    container.append(`: ${definition} `);
    container.appendChild(anchor);
}
function renderDefinition(term, definition, container, referenceHandler) {
    let definitionElement = document.createElement('p');
    definitionElement.classList.add('definition');
    if (definition.def && definition.form) {
        // TODO: multiple forms?
        renderDefinitionWithReference(term, definition.form[0].word, definition.def, definitionElement, referenceHandler);
    } else {
        // TODO combine with above
        let termSignifier = document.createElement('span');
        termSignifier.classList.add('definition', 'term');
        termSignifier.innerText = term;
        definitionElement.appendChild(termSignifier);
        definitionElement.append(`: ${definition.def}`);
    }
    container.appendChild(definitionElement);
    if (definition.tags) {
        let tagElement = document.createElement('p');
        tagElement.classList.add('definition', 'tags');
        // TODO: find better way to render tags, possibly with text per tag
        tagElement.innerText = `word attributes: ${definition.tags.join('; ')}`
        container.appendChild(tagElement);
    }
}
function renderDefinitions(term, defs, container, referenceHandler) {
    let definitionContainer = document.createElement('div');
    for (const definition of defs) {
        renderDefinition(term, definition, definitionContainer, referenceHandler);
    }
    container.appendChild(definitionContainer);
}

export { renderDefinitions }
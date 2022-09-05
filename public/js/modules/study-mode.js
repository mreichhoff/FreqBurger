import { getUnknownWordCount, addCard, inStudyList, getStudyList } from "./data-layer";

const exportStudyListButton = document.getElementById('export-button');

// TODO: counterpart in data layer
const cardTypes = {
    recognition: {
        description: 'Recognition (translate from target language to base language)',
        default: true
    },
    cloze: {
        description: 'Cloze (fill in the missing word)'
    },
    recall: {
        description: 'Recall (translate from base language to target language)'
    }
};
// TODO: combine these two
const cardTypePriorities = ['recognition', 'cloze', 'recall'];

function renderCardTypeOptions(term, example, container) {
    let addedCount = 0;
    for (const cardType of cardTypePriorities) {
        if (inStudyList(term, example, cardType)) {
            continue;
        }
        addedCount++;
        let option = document.createElement('option');
        let metadata = cardTypes[cardType];
        option.innerText = metadata.description;
        option.value = cardType;
        container.appendChild(option);
    }
    return addedCount;
}

function updateUnknownWordCount(element, example) {
    let unknownWordCount = getUnknownWordCount(example.target);
    element.innerText = `Add a flashcard? This sentence has ${unknownWordCount} word${unknownWordCount === 1 ? '' : 's'} not in your study list.`;
}

function renderAddCardControls(term, example, container) {
    let instructions = document.createElement('p');
    instructions.classList.add('instructions', 'add-card');

    let selectorContainer = document.createElement('p');
    selectorContainer.classList.add('add-card-form-item');
    let typeSelectionLabel = document.createElement('label');
    typeSelectionLabel.innerText = `Choose the card type: `;
    let typeSelector = document.createElement('select');
    typeSelector.name = 'cardType';
    const availableOptions = renderCardTypeOptions(term, example, typeSelector);
    if (availableOptions === 0) {
        instructions.innerText = 'This example is already in your study list.';
        container.appendChild(instructions);
        return;
    }
    instructions.classList.add('unknown-update');
    updateUnknownWordCount(instructions, example);
    instructions.addEventListener('list-update', function () {
        updateUnknownWordCount(instructions, example);
    });
    typeSelectionLabel.appendChild(typeSelector);
    selectorContainer.appendChild(typeSelectionLabel);

    let submitContainer = document.createElement('p');
    submitContainer.classList.add('add-card-form-item');
    let submitButton = document.createElement('input');
    submitButton.classList.add('add-card-submit');
    submitButton.type = 'submit';
    submitButton.value = 'Create';
    submitContainer.appendChild(submitButton);
    container.appendChild(instructions);
    container.appendChild(selectorContainer);
    container.appendChild(submitContainer);
}

function renderAddCardForm(term, example, container) {
    let addCardContainer = document.createElement('li');
    addCardContainer.classList.add('example-option');
    let addCardForm = document.createElement('form');
    addCardForm.addEventListener('submit', function (event) {
        event.preventDefault();
        //TODO: why is FormData not working?
        const cardType = event.target.querySelector('select[name="cardType"]').value;
        addCard(term, example, cardType);
        event.target.querySelector('input[type="submit"]').value = 'Added ✅';
        setTimeout(function () {
            addCardForm.innerHTML = '';
            renderAddCardControls(term, example, addCardForm);
            document.querySelectorAll('.unknown-update').forEach(element => {
                const event = new Event('list-update');
                element.dispatchEvent(event);
            });
        }, 300);
    });
    renderAddCardControls(term, example, addCardForm);
    addCardContainer.appendChild(addCardForm);
    container.appendChild(addCardContainer);
}

function exportStudyList(studyList) {
    console.log(JSON.stringify(Object.keys(studyList)));
    let content = "data:text/plain;charset=utf-8,";
    for (const [key, value] of Object.entries(studyList)) {
        // TODO: figure out cloze/recall exports
        if (value.cardType === 'recognition') {
            //replace is a hack for flashcard field separator...TODO could escape
            content += [value.target.join(' ').replace(';', ''), value.base.join(' ').replace(';', '')].join(';');
            content += '\n';
        }
    }
    //wow, surely it can't be this absurd
    let encodedUri = encodeURI(content);
    let link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "freq-miner-export-" + Date.now() + ".txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function initialize() {
    exportStudyListButton.addEventListener('click', function () {
        exportStudyList(getStudyList());
    });
}

export { initialize, renderAddCardForm }
import { getUnknownWordCount, addCard, inStudyList, getStudyList, studyListEmpty, getCardsDue, getLanguagesFromLanguageKey, resultTypes, removeFromStudyList, recordResult } from "./data-layer";
import { clean, cleanTypes } from "./utils";

const exportStudyListButton = document.getElementById('export-button');
const studyModeFallback = document.getElementById('study-mode-fallback');
const studyModeDone = document.getElementById('study-mode-done');
const studyContainer = document.getElementById('study-container');
const studyInstructionsContainer = document.getElementById('study-instructions');
const cardQuestionContainer = document.getElementById('card-question-container');
const cardAnswerContainer = document.getElementById('card-answer-container');

const wrongButton = document.getElementById('wrong-button');
const rightButton = document.getElementById('right-button');
const deleteCardButton = document.getElementById('delete-card-button');
const cardsDue = document.getElementById('cards-due');
const flippedContainer = document.getElementById('flipped-container');
const studyModeContainer = document.getElementById('study-mode');

// TODO: counterpart in data layer
const cardTypes = {
    recognition: {
        description: 'Recognition',
        renderInstructions: function (languages) {
            return `Can you translate the ${languages.target} text into ${languages.base}?`;
        },
        renderQuestion: function (card, container) {
            container.innerText = card.target.join(' ');
        },
        renderAnswer: function (card, container) {
            container.innerText = card.base.join(' ');
        },
        export: function (card) {
            return [card.target.join(' ').replace(';', ''), card.base.join(' ').replace(';', '')].join(';');
        },
        default: true
    },
    cloze: {
        description: 'Cloze',
        renderInstructions: function (languages) {
            return `Can you find the missing ${languages.target} word(s)?`;
        },
        renderQuestion: function (card, container) {
            let missingContainer = document.createElement('p');
            missingContainer.classList.add('cloze-question');
            if (card.term.split(' ').length > 1) {
                // for multi-word terms, just do this regex thing for now
                // TODO make this better
                let regex = new RegExp(card.term, "ig");
                missingContainer.innerText = card.target.join(' ').replace(regex, '____');
            } else {
                // for single term cards, just make a new array with the term replaced with underscores
                missingContainer.innerText = card.target.map(x => {
                    // oh no, ignore case...
                    if (clean(x, cleanTypes.examples, getLanguagesFromLanguageKey(card.languages).target === 'German') === card.term) {
                        return '____';
                    }
                    return x;
                }).join(' ');
            }
            container.appendChild(missingContainer);
            let desiredContainer = document.createElement('p');
            desiredContainer.classList.add('cloze-goal');
            desiredContainer.innerText = card.base.join(' ');
            container.appendChild(desiredContainer);
        },
        renderAnswer: function (card, container) {
            container.innerText = card.term;
        },
        export: function (card) {
            return null;
        }
    },
    recall: {
        description: 'Recall',
        renderInstructions: function (languages) {
            return `Can you translate the ${languages.base} text below into ${languages.target}?`;
        },
        renderQuestion: function (card, container) {
            container.innerText = card.base.join(' ');
        },
        renderAnswer: function (card, container) {
            container.innerText = card.target.join(' ');
        },
        export: function (card) {
            return [card.base.join(' ').replace(';', ''), card.target.join(' ').replace(';', '')].join(';');
        }
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
        }, 200);
    });
    renderAddCardControls(term, example, addCardForm);
    addCardContainer.appendChild(addCardForm);
    container.appendChild(addCardContainer);
}

function exportStudyList(studyList) {
    console.log(JSON.stringify(Object.keys(studyList)));
    let content = "data:text/plain;charset=utf-8,";
    for (const [key, value] of Object.entries(studyList)) {
        // TODO: figure out cloze exports
        const exportedCard = cardTypes[value.cardType].export(value);
        if (exportedCard) {
            content += exportedCard;
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

let currentKey = null;
let currentCard = null;
let flipped = false;

function renderInstructions(card, container) {
    let languages = getLanguagesFromLanguageKey(card.languages);
    container.innerText = cardTypes[card.cardType].renderInstructions(languages);
}

function renderQuestion(card, container) {
    cardTypes[card.cardType].renderQuestion(card, container);
}

function renderAnswer(card, container) {
    cardTypes[card.cardType].renderAnswer(card, container);
}
function wrongHandler(event) {
    event.stopPropagation();
    recordResult(currentKey, resultTypes.incorrect);
    setupStudyMode();
    cardsDue.scrollIntoView();
    cardsDue.classList.add('result-indicator-wrong');
    setTimeout(function () {
        cardsDue.classList.remove('result-indicator-wrong');
    }, 750);
}
function rightHandler(event) {
    event.stopPropagation();
    recordResult(currentKey, resultTypes.correct);
    setupStudyMode();
    cardsDue.scrollIntoView();
    cardsDue.classList.add('result-indicator-right');
    setTimeout(function () {
        cardsDue.classList.remove('result-indicator-right');
    }, 750);
}
function clickFlipHandler() {
    flipped = true;
    flippedContainer.removeAttribute('style');
}
function keyboardShortcutHandler(event) {
    if (!flipped && (event.key === " " || event.code === "Space")) {
        flipped = true;
        flippedContainer.removeAttribute('style');
    } else if (flipped && event.key === "ArrowRight") {
        rightHandler(event);
    } else if (flipped && event.key === "ArrowLeft") {
        wrongHandler(event);
    }
}
function setupStudyMode() {
    flippedContainer.style.visibility = 'hidden';
    if (studyListEmpty()) {
        studyModeContainer.style.display = 'none';
        studyModeFallback.removeAttribute('style');
        return;
    }
    studyModeFallback.style.display = 'none';
    let nextCardDue = getCardsDue();
    if (!nextCardDue) {
        studyModeContainer.style.display = 'none';
        studyModeDone.removeAttribute('style');
        return;
    }
    studyModeDone.style.display = 'none';
    studyModeContainer.removeAttribute('style');
    let count = nextCardDue.count;
    cardsDue.innerText = count;
    flipped = false;
    // ensure we only get one of each handler added
    // which probably means I'm doing something wrong
    studyContainer.removeEventListener('click', clickFlipHandler, { once: true });
    studyContainer.addEventListener('click', clickFlipHandler, { once: true });
    document.removeEventListener('keydown', keyboardShortcutHandler);
    document.addEventListener('keydown', keyboardShortcutHandler);

    currentKey = nextCardDue.key;
    currentCard = nextCardDue.card;
    studyInstructionsContainer.innerHTML = '';
    renderInstructions(currentCard, studyInstructionsContainer);
    cardQuestionContainer.innerHTML = '';
    renderQuestion(currentCard, cardQuestionContainer);
    cardAnswerContainer.innerHTML = '';
    renderAnswer(currentCard, cardAnswerContainer);
}

function teardownStudyMode() {
    studyContainer.removeEventListener('click', clickFlipHandler, { once: true });
    document.removeEventListener('keydown', keyboardShortcutHandler);
}

function setExportVisibility() {
    if (studyListEmpty()) {
        exportStudyListButton.style.display = 'none';
    } else {
        exportStudyListButton.removeAttribute('style');
    }
}

function initialize() {
    exportStudyListButton.addEventListener('click', function () {
        // TODO: try to limit this getStudyList thing....
        exportStudyList(getStudyList());
    });

    wrongButton.addEventListener('click', wrongHandler);
    rightButton.addEventListener('click', rightHandler);
    deleteCardButton.addEventListener('click', function (event) {
        event.stopPropagation();
        let deletedKey = currentKey;
        removeFromStudyList(deletedKey);
        setupStudyMode();
    });
}

export { initialize, renderAddCardForm, setupStudyMode, teardownStudyMode, setExportVisibility }
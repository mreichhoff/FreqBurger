import string
from functools import reduce


def should_block(sentence, blocklist):
    sentence_lowered = sentence.lower()
    for word in blocklist:
        if word in sentence_lowered:
            return True
    return False


def join(tokens, language):
    if language == 'chinese' or language == 'japanese':
        return ''.join(tokens)
    return ' '.join(tokens)


def get_words_with_punctuation(line, language):
    # tokenize the words, not normalizing case or removing punctuation
    # in theory, allowing easy reconstruction of the original text
    # while making it possible to differentiate between the tokens
    if language == 'chinese':
        # TODO handle non-space delimited, such as chinese or japanese
        return []
    elif language == 'japanese':
        return []
    # TODO: experimenting with space only for now instead of nltk
    return line.split(' ')


def normalize_case(word, ignore_case):
    if ignore_case:
        return word.lower()
    return word


def tokenize(line, language, ignore_case):
    # TODO handle non-space delimited, such as chinese or japanese
    if language == 'chinese':
        return []
    elif language == 'japanese':
        return []
    # TODO: experimenting with space only for now instead of nltk
    return [normalize_case(x, ignore_case).strip(string.punctuation + '¿' + '¡') for x in line.split(' ')]


def get_average_frequency_rank(word_frequencies, words):
    # words assumed to be properly lowercased, etc.
    return reduce(lambda a, b: a + b, [word_frequencies[word]
                                       if word in word_frequencies else len(word_frequencies) for word in words]) / len(words)

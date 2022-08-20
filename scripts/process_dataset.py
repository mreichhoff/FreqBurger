import argparse
import json
import string
from heapq import heappush, heappushpop
from functools import reduce


def get_average_frequency_rank(word_frequencies, words):
    # words assumed to be properly lowercased, etc.
    return reduce(lambda a, b: a + b, [word_frequencies[word]
                                       if word in word_frequencies else len(word_frequencies) for word in words]) / len(words)


def should_block(sentence, blocklist):
    sentence_lowered = sentence.lower()
    for word in blocklist:
        if word in sentence_lowered:
            return True
    return False


def get_blocklist(filename):
    with open(filename) as f:
        return [x.strip() for x in f]


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
    return [normalize_case(x, ignore_case).strip(string.punctuation) for x in line.split(' ')]


def get_frequencies(filename, language, ignore_case):
    freqs = {}
    with open(filename) as f:
        for line in f:
            words = tokenize(line.strip(), language, ignore_case)
            for word in words:
                if word == '' or word[0].isnumeric():
                    # TODO: ??
                    continue
                if word not in freqs:
                    freqs[word] = 0
                freqs[word] += 1
    return freqs


def main():
    parser = argparse.ArgumentParser(
        description='Get the simplest possible examples for each word in a dataset')
    parser.add_argument(
        '--base-language', help='a lowercase language name, like chinese or english.')
    parser.add_argument(
        '--target-language', help='a lowercase language name, like chinese or english.')
    parser.add_argument(
        '--base-sentences-filename', help='the filename of a list of sentences in the base language')
    parser.add_argument(
        '--target-sentences-filename', help='the filename of a list of sentences in the target language')
    parser.add_argument('--n', help='the number of examples per word')
    parser.add_argument('--blocklist-filename',
                        help='a filename with vulgar or offensive words that should be excluded')
    parser.add_argument(
        '--min', help='the minimum number of occurrences of a word')

    parser.add_argument(
        '--base-ignore-case', help='lowercase all words (recommended except for, e.g., German)', action=argparse.BooleanOptionalAction)
    parser.add_argument(
        '--target-ignore-case', help='lowercase all words (recommended except for, e.g., German)', action=argparse.BooleanOptionalAction)
    parser.add_argument(
        '--get-base-examples', help='find simple target language sentences that contain base language words', action=argparse.BooleanOptionalAction)

    args = parser.parse_args()
    target_freqs = get_frequencies(
        args.target_sentences_filename, args.target_language, args.target_ignore_case)
    sorted_freqs = sorted(
        target_freqs.items(), key=lambda kvp: kvp[1], reverse=True)
    ranked_freqs = {x[0]: index for index, x in enumerate(sorted_freqs)}

    word_set = {}
    if args.get_base_examples:
        # if attempting to build an index on base language, we still need target frequency
        # because we're looking for the simplest target language sentences with base word.
        # we do not need rankings of base words by frequency, however.
        base_freqs = get_frequencies(
            args.base_sentences_filename, args.base_language, args.base_ignore_case)
        word_set = {key: [] for key,
                    value in base_freqs.items() if value >= int(args.min)}
    else:
        word_set = {key: [] for key,
                    value in target_freqs.items() if value >= int(args.min)}

    blocklist = get_blocklist(args.blocklist_filename)

    seen = set()
    with open(args.target_sentences_filename) as target_file:
        with open(args.base_sentences_filename) as base_file:
            for line in target_file:
                target = line.strip()
                base = base_file.readline().strip()
                target_tokens = tokenize(
                    target, args.target_language, args.target_ignore_case)

                key = target.translate(str.maketrans(
                    '', '', string.punctuation)).replace(' ', '')
                if key in seen:
                    continue
                seen.add(key)

                if should_block(target, blocklist) or should_block(base, blocklist):
                    continue

                target_words = get_words_with_punctuation(
                    target, args.target_language)
                base_words = get_words_with_punctuation(
                    base, args.base_language)
                average_freq = get_average_frequency_rank(
                    ranked_freqs, target_tokens)

                if args.get_base_examples:
                    tokens = tokenize(base, args.base_language,
                                      args.base_ignore_case)
                else:
                    tokens = target_tokens

                for word in tokens:
                    if word not in word_set:
                        continue
                    if len(word_set[word]) < int(args.n):
                        heappush(word_set[word],
                                 (-average_freq, target_words, base_words))
                    else:
                        heappushpop(
                            word_set[word], (-average_freq, target_words, base_words))

    if args.get_base_examples:
        print(json.dumps({key: {'examples': [(x[1], x[2]) for x in sorted(value, key=lambda kvp:kvp[0], reverse=True)]}
                          for key, value in word_set.items()}, ensure_ascii=False))
    else:
        print(json.dumps({key: {'freq': ranked_freqs[key], 'examples': [(x[1], x[2]) for x in sorted(value, key=lambda kvp:kvp[0], reverse=True)]}
                          for key, value in word_set.items()}, ensure_ascii=False))


if __name__ == '__main__':
    main()

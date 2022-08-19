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
        '--language', help='a lowercase language name, like chinese or english.')
    parser.add_argument(
        '--base-sentences-filename', help='the filename of a list of sentences in the base language')
    parser.add_argument(
        '--target-sentences-filename', help='the filename of a list of sentences in the target language')
    parser.add_argument('--n', help='the number of examples per word')
    parser.add_argument(
        '--ignore-case', help='lowercase all words (recommended except for, e.g., German)', action=argparse.BooleanOptionalAction)
    parser.add_argument('--blocklist-filename',
                        help='a filename with vulgar or offensive words that should be excluded')
    parser.add_argument(
        '--min', help='the minimum number of occurrences of a word')

    args = parser.parse_args()
    raw_freqs = get_frequencies(
        args.target_sentences_filename, args.language, args.ignore_case)
    sorted_freqs = sorted(
        raw_freqs.items(), key=lambda kvp: kvp[1], reverse=True)
    freqs = {x[0]: index for index, x in enumerate(sorted_freqs)}

    word_set = {key: [] for key,
                value in raw_freqs.items() if value >= int(args.min)}

    blocklist = get_blocklist(args.blocklist_filename)

    seen = set()
    with open(args.target_sentences_filename) as target_file:
        with open(args.base_sentences_filename) as base_file:
            for line in target_file:
                target = line.strip()
                base = base_file.readline().strip()
                target_tokens = tokenize(
                    target, args.language, args.ignore_case)

                key = target.translate(str.maketrans(
                    '', '', string.punctuation)).replace(' ', '')
                if key in seen:
                    continue
                seen.add(key)

                if should_block(target, blocklist) or should_block(base, blocklist):
                    continue

                target_words = get_words_with_punctuation(
                    target, args.language)
                average_freq = get_average_frequency_rank(
                    freqs, target_tokens)

                for word in target_tokens:
                    if word not in word_set:
                        continue
                    if len(word_set[word]) < int(args.n):
                        heappush(word_set[word],
                                 (-average_freq, target_words, base))
                    else:
                        heappushpop(
                            word_set[word], (-average_freq, target_words, base))

    print(json.dumps({key: {'freq': freqs[key], 'examples': [(x[1], x[2]) for x in value]}
                      for key, value in word_set.items()}, ensure_ascii=False))


if __name__ == '__main__':
    main()

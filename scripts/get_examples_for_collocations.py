import argparse
import json
import string

from heapq import heappush, heappushpop

from lang_utils import get_average_frequency_rank, get_words_with_punctuation, tokenize, should_block, join


def get_collocations(filename):
    with open(filename) as f:
        full_set = json.load(f)
        result = {}
        for value in full_set.values():
            for item in value.keys():
                result[item] = []
        return result


def get_ranked_freqs(filename):
    with open(filename) as f:
        full_set = json.load(f)
        freqs = {key: value['freq'] for key, value in full_set.items()}
        sorted_freqs = sorted(freqs.items(), key=lambda kvp: kvp[1])
        return {x[0]: index for index, x in enumerate(sorted_freqs)}


def get_blocklist(filename):
    with open(filename) as f:
        return [x.strip() for x in f]


def main():
    parser = argparse.ArgumentParser(
        description='get collocations for a set of words')
    parser.add_argument(
        '--base-sentences-filename', help='the filename of a list of sentences in the base language')
    parser.add_argument(
        '--target-sentences-filename', help='the filename of a list of sentences in the target language')
    parser.add_argument(
        '--collocations-file', help='the output of sort_collocations.py that will supply the list of collocations')
    parser.add_argument(
        '--num-examples', help='the number of examples per collocation')
    parser.add_argument(
        '--n', help='the n in ngram')
    parser.add_argument(
        '--base-language', help='a lowercase language name, like chinese or english.')
    parser.add_argument(
        '--target-language', help='a lowercase language name, like chinese or english.')
    parser.add_argument(
        '--base-ignore-case', help='lowercase all words (recommended except for, e.g., German)', action=argparse.BooleanOptionalAction)
    parser.add_argument(
        '--target-ignore-case', help='lowercase all words (recommended except for, e.g., German)', action=argparse.BooleanOptionalAction)
    parser.add_argument('--blocklist-filename',
                        help='a filename with vulgar or offensive words that should be excluded')
    parser.add_argument('--freq-ranked-filename',
                        help='output of process_dataset, used to get word freqs')
    args = parser.parse_args()

    ranked_freqs = get_ranked_freqs(args.freq_ranked_filename)
    collocations = get_collocations(args.collocations_file)
    blocklist = get_blocklist(args.blocklist_filename)
    seen = set()
    n = int(args.n)
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

                for i in range(len(target_tokens) - (n-1)):
                    current_ngram = []
                    for j in range(n):
                        current_ngram.append(target_tokens[i+j])
                    if len(current_ngram) != n:
                        continue
                    ngram_joined = join(current_ngram, args.target_language)
                    if ngram_joined not in collocations:
                        continue
                    if len(collocations[ngram_joined]) < int(args.n):
                        heappush(collocations[ngram_joined],
                                 (-average_freq, target_words, base_words))
                    else:
                        heappushpop(
                            collocations[ngram_joined], (-average_freq, target_words, base_words))
    print(json.dumps({key: {'examples': [(x[1], x[2]) for x in sorted(value, key=lambda kvp:kvp[0], reverse=True)]}
                      for key, value in collocations.items()}, ensure_ascii=False))


if __name__ == '__main__':
    main()

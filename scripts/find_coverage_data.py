import argparse
import json
from lang_utils import tokenize
from itertools import accumulate


def get_frequencies(filename, language, ignore_case):
    freqs = {}
    total_tokens = 0
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
                total_tokens += 1
    return (total_tokens, freqs)


def main():
    parser = argparse.ArgumentParser(
        description='Load a set of files into a firestore collection')
    parser.add_argument(
        '--target-language', help='a lowercase language name, like chinese or english')
    parser.add_argument('-f', '--file-list', nargs='+',
                        help='The list of files to process', required=True)
    parser.add_argument('-k', '--file-list-keys', nargs='+',
                        help='The list of keys; for example, a dataset from tatoeba might use tatoeba as the key', required=True)
    parser.add_argument(
        '--ignore-case', help='lowercase all words (recommended except for, e.g., German)', action=argparse.BooleanOptionalAction)

    args = parser.parse_args()
    key_with_dataset = zip(args.file_list_keys, args.file_list)

    result = {}
    for dataset, filename in key_with_dataset:
        total, freqs = get_frequencies(
            filename, args.target_language, args.ignore_case)
        percentages = [(value / total)
                       for value in sorted(freqs.values(), reverse=True)]
        cumulative_percentages = list(accumulate(percentages))
        result[dataset] = cumulative_percentages[0::100]

    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()

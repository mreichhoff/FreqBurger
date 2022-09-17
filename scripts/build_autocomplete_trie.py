import argparse
import json


def get_freqs_for_dataset(filename, all_words):
    all_freqs = {}
    with open(filename) as f:
        curr = json.load(f)
        for key, value in curr.items():
            # TODO: figure out this spacing nonsense
            if key.strip() != key:
                continue
            all_words.add(key)
            all_freqs[key] = value['freq']
    return all_freqs


def main():
    parser = argparse.ArgumentParser(
        description='build a trie for autocomplete based on vocabulary ranked by frequency')
    parser.add_argument('-f', '--file-list', nargs='+',
                        help='The list of files to process', required=True)
    parser.add_argument(
        '--max', help='the max number of recommendations for a given prefix')
    args = parser.parse_args()
    datasets = []
    all_words = set()
    for filename in args.file_list:
        datasets.append(get_freqs_for_dataset(filename, all_words))

    total_freqs = {}
    for word in all_words:
        total = 0
        for dataset in datasets:
            if word in dataset:
                total += dataset[word]
            else:
                total += len(dataset.keys())
        total_freqs[word] = total

    sorted_words_with_freqs = sorted(total_freqs.items(),
                                     key=lambda kvp: kvp[1])
    # print(json.dumps(
    #     [x[0] for x in sorted_words_with_freqs[0:50000]], ensure_ascii=False))
    # exit()

    max = int(args.max)
    trie = {}
    trie_runner = trie
    for item in sorted_words_with_freqs:
        for letter in item[0][0:15]:
            if not letter in trie_runner:
                trie_runner[letter] = {'words': []}
            if len(trie_runner[letter]['words']) < max:
                trie_runner[letter]['words'].append(item[0])
            trie_runner = trie_runner[letter]
        trie_runner = trie

    print(json.dumps(trie, ensure_ascii=False))


if __name__ == '__main__':
    main()

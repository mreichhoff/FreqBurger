import argparse
import json
from heapq import heappush, heappushpop


def get_filter(filename):
    with open(filename) as f:
        total = json.load(f)
        return {key for key in total.keys()}


def main():
    parser = argparse.ArgumentParser(
        description='given preprocessed collocations and counts, output the N most frequent collocations')
    parser.add_argument(
        '--filename', help='the filename of the precalculated collocation counts')
    parser.add_argument(
        '--n', help='the number of desired collocations')
    parser.add_argument(
        '--existing-collocations', help='a set of existing collocations that can filter output')
    args = parser.parse_args()

    # preprocess_collocations dedupes, so array is ok
    collocation_set = []
    with open(args.filename) as f:
        for line in f:
            kvp = line.strip().split('\t')
            if len(kvp) != 2:
                continue
            key = kvp[0]
            value = int(kvp[1])
            if len(collocation_set) < int(args.n):
                heappush(collocation_set, (value, key))
            else:
                heappushpop(collocation_set, (value, key))
    filter_set = get_filter(args.existing_collocations)

    print(json.dumps({collocation[1]: []
          for collocation in collocation_set if collocation[1] not in filter_set}, ensure_ascii=False))


if __name__ == '__main__':
    main()

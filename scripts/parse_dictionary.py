import argparse
import json


def main():
    parser = argparse.ArgumentParser(
        description='parse a dictionary file')
    parser.add_argument(
        '--filename', help='the filename of the dictionary to be parsed')
    args = parser.parse_args()

    word_key = 'word'
    senses_key = 'senses'
    raw_glosses_key = 'raw_glosses'
    tags_key = 'tags'
    form_of_key = 'form_of'

    output = {}
    with open(args.filename) as f:
        for line in f:
            curr = json.loads(line)
            if curr[word_key] not in output:
                output[curr[word_key]] = []
            for sense in curr[senses_key]:
                if raw_glosses_key not in sense:
                    # print(json.dumps(curr))
                    continue
                output[curr[word_key]].append(
                    {'def': '; '.join(sense[raw_glosses_key])})
                if tags_key in sense:
                    output[curr[word_key]][len(
                        output[curr[word_key]])-1]['tags'] = sense[tags_key]
                if form_of_key in sense:
                    output[curr[word_key]][len(
                        output[curr[word_key]])-1]['form'] = sense[form_of_key]

    print(json.dumps(output, ensure_ascii=False))


if __name__ == '__main__':
    main()

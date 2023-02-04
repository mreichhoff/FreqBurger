import json
import argparse


def parse_cedict_line(line):
    line = line.rstrip('/').split('/')
    english = ', '.join(line[1:]).strip().rstrip(',')
    char, pinyin = line[0].split('[')
    traditional, simplified = char.split()

    return (simplified, traditional, english, pinyin.rstrip().rstrip(']'))


def get_dictionary_entries(dict_filename):
    result = {}
    with open(dict_filename) as f:
        for line in f:
            if not line.startswith('#') and len(line) > 0 and len(line.rstrip('/').split('/')) > 1:
                entry = parse_cedict_line(line)
                # simplified
                if entry[0] not in result:
                    result[entry[0]] = []
                result[entry[0]].append(
                    {'def': entry[2], 'transcription': entry[3]})
                # traditional characters
                # if entry[0] != entry[1]:
                #     if entry[1] not in result:
                #         result[entry[1]] = []
                #     result[entry[1]].append(
                #         {'def': entry[2], 'transcription': entry[3]})
    return result


def main():
    parser = argparse.ArgumentParser(
        description='Get definitions from CEDICT. Outputs JSON.')
    parser.add_argument(
        '--dict-filename', help='the dictionary filename, currently compatible with cedict')

    args = parser.parse_args()

    result = get_dictionary_entries(
        args.dict_filename)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()

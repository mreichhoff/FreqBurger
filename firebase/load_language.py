import argparse
import json
import concurrent.futures

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore


def transform(process_dataset_item):
    result = {}
    # freq is not present in base language keys. examples should always be present
    if 'freq' in process_dataset_item:
        result['freq'] = process_dataset_item['freq']
    result['examples'] = [{'target': example[0], 'base': example[1]}
                          for example in process_dataset_item['examples']]
    return result


allkeys = set()
data = {}


def load_document(collection, key, document):
    collection.document(key).set(document, merge=True)
    print(key)


def main():
    parser = argparse.ArgumentParser(
        description='Load a set of files into a firestore collection')
    parser.add_argument(
        '--base-language', help='a lowercase language name, like chinese or english')
    parser.add_argument(
        '--target-language', help='a lowercase language name, like chinese or english')
    parser.add_argument(
        '--credential-path', help='path to firestore credentials with the appropriate permissions')
    parser.add_argument('-f', '--file-list', nargs='+',
                        help='The list of files to process', required=True)
    parser.add_argument('-k', '--file-list-keys', nargs='+',
                        help='The list of keys; for example, a dataset from tatoeba might use tatoeba as the key', required=True)
    parser.add_argument(
        '--get-base-examples', help='find simple target language sentences that contain base language words', action=argparse.BooleanOptionalAction)
    args = parser.parse_args()

    key_with_dataset = zip(args.file_list_keys, args.file_list)

    data = {}
    for key, filename in key_with_dataset:
        with open(filename) as f:
            data[key] = json.load(f)
    collection_id = f"{args.target_language}-{args.base_language}"
    word_key_suffix = 'base' if args.get_base_examples else 'target'

    allkeys = set().union(*[dataset for dataset in data.values()])

    cred = credentials.Certificate(args.credential_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    collection = db.collection(collection_id)
    # index = 0
    # print(len(allkeys))
    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
        for item in allkeys:
            if '/' in item or item == '.' or item == '..':
                print(f"failed to write: {item}")
                continue
            key = f"{item}-{word_key_suffix}"
            document = {}
            should_write = False
            for dataset_key, dataset in data.items():
                if item in dataset and len(dataset[item]['examples']) > 0:
                    document[dataset_key] = transform(dataset[item])
                    should_write = True
                else:
                    document[dataset_key] = {}
            possible_words = item.split(' ')
            if len(possible_words) > 1:
                document['words'] = possible_words
            if should_write:
                executor.submit(load_document, collection, key, document)
            # index = index+1
            # print(key)
            # if index >= 10:
            #     break


if __name__ == '__main__':
    main()

import argparse
import json
import concurrent.futures

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore


def load_document(collection, key, document):
    collection.document(key).set(document, merge=True)
    print(key)


def main():
    parser = argparse.ArgumentParser(
        description='Load collocations into an existing set of word documents')
    parser.add_argument(
        '--base-language', help='a lowercase language name, like chinese or english')
    parser.add_argument(
        '--target-language', help='a lowercase language name, like chinese or english')
    parser.add_argument(
        '--credential-path', help='path to firestore credentials with the appropriate permissions')
    parser.add_argument('-f', '--file-list', nargs='+',
                        help='The list of files to process', required=True)
    parser.add_argument(
        '--dataset-key', help='the key of the dataset, used when loading via load_language.py')
    args = parser.parse_args()
    collection_id = f"{args.target_language}-{args.base_language}"

    cred = credentials.Certificate(args.credential_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    collection = db.collection(collection_id)

    # TODO: move this to a shared constants file
    word_key_suffix = 'target'
    all_words = {}
    # index = 0
    for file in args.file_list:
        with open(file) as dataset:
            data = json.load(dataset)
            for key, value in data.items():
                if key not in all_words:
                    all_words[key] = {args.dataset_key: {'collocations': {}}}
                all_words[key][args.dataset_key]['collocations'] = all_words[key][args.dataset_key]['collocations'] | value

    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
        for word, document in all_words.items():
            executor.submit(load_document, collection,
                            f"{word}-{word_key_suffix}", document)
            # index = index+1
            # if index > 10:
            #     break


if __name__ == '__main__':
    main()

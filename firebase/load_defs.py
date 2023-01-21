import argparse
import json
import concurrent.futures
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore


def load_document(collection, key, document):
    collection.document(key).set({'defs': document}, merge=True)
    print(key)


def main():
    parser = argparse.ArgumentParser(
        description='parse a dictionary file')
    parser = argparse.ArgumentParser(
        description='Load a dictionary file into a firestore collection')
    parser.add_argument(
        '--base-language', help='a lowercase language name, like chinese or english')
    parser.add_argument(
        '--target-language', help='a lowercase language name, like chinese or english')
    parser.add_argument(
        '--credential-path', help='path to firestore credentials with the appropriate permissions')
    parser.add_argument(
        '--filename', help='the filename of the dictionary to be parsed')
    args = parser.parse_args()

    dictionary = {}
    with open(args.filename) as f:
        dictionary = json.load(f)
    collection_id = f"{args.target_language}-{args.base_language}"

    cred = credentials.Certificate(args.credential_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    collection = db.collection(collection_id)

    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as executor:
        futures = []
        # index = 0
        for key, document in dictionary.items():
            # index = index + 1
            futures.append(executor.submit(
                load_document, collection, f"{key}-target", document))
            # if index > 10:
            #     break
        # TODO: what was i going to do here?
        for future in futures:
            future.result()


if __name__ == '__main__':
    main()

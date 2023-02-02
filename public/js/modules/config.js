const datasetMetadata = {
    'tatoeba': {
        'name': 'Tatoeba',
        'description': 'A crowdsourced collection of translated sentences. Mostly colloquial, often geared towards learners.',
        'attributionUrl': 'https://tatoeba.org',
        'attributionSiteName': 'Tatoeba'
    },
    'commoncrawl': {
        'name': 'CommonCrawl',
        'description': 'Multilingual website text from a web crawler. Often formal, like marketing text or terms of use.',
        'attributionUrl': 'https://opus.nlpl.eu/CCAligned.php',
        'attributionSiteName': 'Opus'
    },
    'opensubs': {
        'name': 'OpenSubtitles',
        'description': 'Movie and TV subtitles with translations. Usually colloquial.',
        'attributionUrl': 'https://opus.nlpl.eu/OpenSubtitles2018.php',
        'attributionSiteName': 'Opus'
    },
    'wiki': {
        'name': 'Wiki',
        'description': 'Wikipedia articles with translations. Often formal.',
        'attributionUrl': 'https://opus.nlpl.eu/Wikipedia.php',
        'attributionSiteName': 'Opus'
    }
};

const languageMetadata = {
    'french': {
        'key': 'fr',
        'tts': {
            // include both locale formats because of seemingly off-spec behavior on android
            locales: ['fr-FR', 'fr_FR'],
            // include preferred names because of a recent iOS update having odd voices
            preferredName: 'Thomas'
        },
        'label': 'French',
        'starters': {
            word: 'parle',
            phrase: 'tout le monde en parle',
            base: 'classic'
        }
    },
    'spanish': {
        'key': 'es',
        'tts': {
            locales: ['es-ES', 'es_ES'],
            preferredName: 'Mónica'
        },
        'label': 'Spanish',
        'starters': {
            word: 'empresa',
            phrase: 'la mañana siguiente',
            base: 'classic'
        }
    },
    'italian': {
        'key': 'it',
        'tts': {
            locales: ['it-IT', 'it_IT'],
            preferredName: 'Alice'
        },
        'label': 'Italian',
        'starters': {
            word: 'bisogno',
            phrase: 'ha bisogno di',
            base: 'walk'
        }
    },
    'german': {
        'key': 'de',
        'tts': {
            locales: ['de-DE', 'de_DE'],
            preferredName: 'Anna'
        },
        'label': 'German',
        'noLowering': true,
        'starters': {
            word: 'schnell',
            phrase: 'schnell wie möglich',
            base: 'contact'
        }
    },
    'chinese': {
        'key': 'zh',
        'tts': {
            locales: ['zh-CN', 'zh_CN'],
            preferredName: 'Tingting'
        },
        'label': 'Chinese',
        'noSpaces': true,
        'starters': {
            word: '照顾',
            phrase: '照顾好自己',
            base: 'yourself'
        }
    },
    'japanese': {
        'key': 'ja',
        'tts': {
            locales: ['ja-JP', 'ja_JP'],
            preferredName: 'Kyoko'
        },
        'label': 'Japanese',
        'noSpaces': true,
        'starters': {
            word: '指導',
            phrase: 'の指導者',
            base: 'classic'
        }
    },
    'english': {
        'key': 'en',
        'label': 'English'
    }
};

const defaultBaseLanguage = 'english';

export { datasetMetadata, languageMetadata, defaultBaseLanguage }
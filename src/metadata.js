const urlMetadata = require('url-metadata');

(async () => {
    try {
        const url = 'https://www.bezrealitky.cz/nemovitosti-byty-domy/879659-nabidka-prodej-pozemku-babice';
        const metadata = await urlMetadata(url);
        console.log(metadata);
    } catch (err) {
        console.log(err);
    }
})();

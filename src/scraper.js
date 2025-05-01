'use strict';

require('dotenv').config();
const { chromium } = require('patchright');
const cron = require("cron");
const urlMetadata = require('url-metadata');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { Client, ActivityType, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions] });

const fs = require('fs');
const FILE_PATH = '../data/listings.json';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const BEZREALITKY_HOUSES_JSON = { "operationName": "MarkerList", "variables": { "order": "TIMEORDER_DESC", "offerType": ["PRODEJ"], "estateType": ["DUM"], "disposition": ["DISP_3_KK", "DISP_3_1", "DISP_4_KK", "DISP_4_1", "DISP_5_KK", "DISP_5_1", "DISP_6_KK", "DISP_6_1", "DISP_7_KK", "DISP_7_1", "OSTATNI"], "priceTo": 10000000, "location": "fromMap", "country": "ceska-republika", "provinces": ["praha", "plzensky", "stredocesky"], "currency": "CZK", "regionOsmIds": ["R435541", "R442466", "R442397"], "construction": [] }, "query": "query MarkerList($estateType: [EstateType], $offerType: [OfferType], $disposition: [Disposition], $landType: [LandType], $region: ID, $regionOsmIds: [ID], $order: ResultOrder = TIMEORDER_DESC, $petFriendly: Boolean, $balconyFrom: Float, $balconyTo: Float, $loggiaFrom: Float, $loggiaTo: Float, $terraceFrom: Float, $terraceTo: Float, $cellarFrom: Float, $cellarTo: Float, $frontGardenFrom: Float, $frontGardenTo: Float, $parking: Boolean, $garage: Boolean, $lift: Boolean, $ownership: [Ownership], $condition: [Condition], $construction: [Construction], $equipped: [Equipped], $priceFrom: Int, $priceTo: Int, $surfaceFrom: Int, $surfaceTo: Int, $surfaceLandFrom: Int, $surfaceLandTo: Int, $advertId: [ID], $roommate: Boolean, $includeImports: Boolean, $boundaryPoints: [GPSPointInput], $discountedOnly: Boolean, $polygonBuffer: Int, $barrierFree: Boolean, $availableFrom: DateTime, $importType: AdvertImportType, $currency: Currency, $searchPriceWithCharges: Boolean, $lowEnergy: Boolean) {\n  markers: advertMarkers(\n    offerType: $offerType\n    estateType: $estateType\n    disposition: $disposition\n    landType: $landType\n    regionId: $region\n    regionOsmIds: $regionOsmIds\n    order: $order\n    petFriendly: $petFriendly\n    balconySurfaceFrom: $balconyFrom\n    balconySurfaceTo: $balconyTo\n    loggiaSurfaceFrom: $loggiaFrom\n    loggiaSurfaceTo: $loggiaTo\n    terraceSurfaceFrom: $terraceFrom\n    terraceSurfaceTo: $terraceTo\n    cellarSurfaceFrom: $cellarFrom\n    cellarSurfaceTo: $cellarTo\n    frontGardenSurfaceFrom: $frontGardenFrom\n    frontGardenSurfaceTo: $frontGardenTo\n    parking: $parking\n    garage: $garage\n    lift: $lift\n    ownership: $ownership\n    condition: $condition\n    construction: $construction\n    equipped: $equipped\n    priceFrom: $priceFrom\n    priceTo: $priceTo\n    surfaceFrom: $surfaceFrom\n    surfaceTo: $surfaceTo\n    surfaceLandFrom: $surfaceLandFrom\n    surfaceLandTo: $surfaceLandTo\n    ids: $advertId\n    roommate: $roommate\n    includeImports: $includeImports\n    boundaryPoints: $boundaryPoints\n    discountedOnly: $discountedOnly\n    polygonBuffer: $polygonBuffer\n    barrierFree: $barrierFree\n    availableFrom: $availableFrom\n    importType: $importType\n    currency: $currency\n    searchPriceWithCharges: $searchPriceWithCharges\n    lowEnergy: $lowEnergy\n  ) {\n    id\n    uri\n    estateType\n    gps {\n      lat\n      lng\n      __typename\n    }\n    __typename\n  }\n}" }
const BEZREALITKY_FLATS_JSON = { "operationName": "MarkerList", "variables": { "order": "TIMEORDER_DESC", "offerType": ["PRODEJ"], "estateType": ["BYT"], "disposition": ["DISP_3_KK", "DISP_3_1", "DISP_4_KK", "DISP_4_1", "DISP_5_KK", "DISP_5_1", "DISP_6_KK", "DISP_6_1", "DISP_7_KK", "DISP_7_1", "OSTATNI"], "priceTo": 10000000, "location": "fromMap", "country": "ceska-republika", "provinces": ["praha", "plzensky", "stredocesky"], "currency": "CZK", "regionOsmIds": ["R435541", "R442466", "R442397"], "construction": [] }, "query": "query MarkerList($estateType: [EstateType], $offerType: [OfferType], $disposition: [Disposition], $landType: [LandType], $region: ID, $regionOsmIds: [ID], $order: ResultOrder = TIMEORDER_DESC, $petFriendly: Boolean, $balconyFrom: Float, $balconyTo: Float, $loggiaFrom: Float, $loggiaTo: Float, $terraceFrom: Float, $terraceTo: Float, $cellarFrom: Float, $cellarTo: Float, $frontGardenFrom: Float, $frontGardenTo: Float, $parking: Boolean, $garage: Boolean, $lift: Boolean, $ownership: [Ownership], $condition: [Condition], $construction: [Construction], $equipped: [Equipped], $priceFrom: Int, $priceTo: Int, $surfaceFrom: Int, $surfaceTo: Int, $surfaceLandFrom: Int, $surfaceLandTo: Int, $advertId: [ID], $roommate: Boolean, $includeImports: Boolean, $boundaryPoints: [GPSPointInput], $discountedOnly: Boolean, $polygonBuffer: Int, $barrierFree: Boolean, $availableFrom: DateTime, $importType: AdvertImportType, $currency: Currency, $searchPriceWithCharges: Boolean, $lowEnergy: Boolean) {\n  markers: advertMarkers(\n    offerType: $offerType\n    estateType: $estateType\n    disposition: $disposition\n    landType: $landType\n    regionId: $region\n    regionOsmIds: $regionOsmIds\n    order: $order\n    petFriendly: $petFriendly\n    balconySurfaceFrom: $balconyFrom\n    balconySurfaceTo: $balconyTo\n    loggiaSurfaceFrom: $loggiaFrom\n    loggiaSurfaceTo: $loggiaTo\n    terraceSurfaceFrom: $terraceFrom\n    terraceSurfaceTo: $terraceTo\n    cellarSurfaceFrom: $cellarFrom\n    cellarSurfaceTo: $cellarTo\n    frontGardenSurfaceFrom: $frontGardenFrom\n    frontGardenSurfaceTo: $frontGardenTo\n    parking: $parking\n    garage: $garage\n    lift: $lift\n    ownership: $ownership\n    condition: $condition\n    construction: $construction\n    equipped: $equipped\n    priceFrom: $priceFrom\n    priceTo: $priceTo\n    surfaceFrom: $surfaceFrom\n    surfaceTo: $surfaceTo\n    surfaceLandFrom: $surfaceLandFrom\n    surfaceLandTo: $surfaceLandTo\n    ids: $advertId\n    roommate: $roommate\n    includeImports: $includeImports\n    boundaryPoints: $boundaryPoints\n    discountedOnly: $discountedOnly\n    polygonBuffer: $polygonBuffer\n    barrierFree: $barrierFree\n    availableFrom: $availableFrom\n    importType: $importType\n    currency: $currency\n    searchPriceWithCharges: $searchPriceWithCharges\n    lowEnergy: $lowEnergy\n  ) {\n    id\n    uri\n    estateType\n    gps {\n      lat\n      lng\n      __typename\n    }\n    __typename\n  }\n}" }
const BEZREALITKY_LANDS_JSON = { "operationName": "MarkerList", "variables": { "order": "TIMEORDER_DESC", "offerType": ["PRODEJ"], "estateType": ["DUM"], "disposition": ["DISP_3_KK", "DISP_3_1", "DISP_4_KK", "DISP_4_1", "DISP_5_KK", "DISP_5_1", "DISP_6_KK", "DISP_6_1", "DISP_7_KK", "DISP_7_1", "OSTATNI"], "priceTo": 10000000, "location": "fromMap", "country": "ceska-republika", "provinces": ["praha", "plzensky", "stredocesky"], "currency": "CZK", "regionOsmIds": ["R435541", "R442466", "R442397"], "construction": [] }, "query": "query MarkerList($estateType: [EstateType], $offerType: [OfferType], $disposition: [Disposition], $landType: [LandType], $region: ID, $regionOsmIds: [ID], $order: ResultOrder = TIMEORDER_DESC, $petFriendly: Boolean, $balconyFrom: Float, $balconyTo: Float, $loggiaFrom: Float, $loggiaTo: Float, $terraceFrom: Float, $terraceTo: Float, $cellarFrom: Float, $cellarTo: Float, $frontGardenFrom: Float, $frontGardenTo: Float, $parking: Boolean, $garage: Boolean, $lift: Boolean, $ownership: [Ownership], $condition: [Condition], $construction: [Construction], $equipped: [Equipped], $priceFrom: Int, $priceTo: Int, $surfaceFrom: Int, $surfaceTo: Int, $surfaceLandFrom: Int, $surfaceLandTo: Int, $advertId: [ID], $roommate: Boolean, $includeImports: Boolean, $boundaryPoints: [GPSPointInput], $discountedOnly: Boolean, $polygonBuffer: Int, $barrierFree: Boolean, $availableFrom: DateTime, $importType: AdvertImportType, $currency: Currency, $searchPriceWithCharges: Boolean, $lowEnergy: Boolean) {\n  markers: advertMarkers(\n    offerType: $offerType\n    estateType: $estateType\n    disposition: $disposition\n    landType: $landType\n    regionId: $region\n    regionOsmIds: $regionOsmIds\n    order: $order\n    petFriendly: $petFriendly\n    balconySurfaceFrom: $balconyFrom\n    balconySurfaceTo: $balconyTo\n    loggiaSurfaceFrom: $loggiaFrom\n    loggiaSurfaceTo: $loggiaTo\n    terraceSurfaceFrom: $terraceFrom\n    terraceSurfaceTo: $terraceTo\n    cellarSurfaceFrom: $cellarFrom\n    cellarSurfaceTo: $cellarTo\n    frontGardenSurfaceFrom: $frontGardenFrom\n    frontGardenSurfaceTo: $frontGardenTo\n    parking: $parking\n    garage: $garage\n    lift: $lift\n    ownership: $ownership\n    condition: $condition\n    construction: $construction\n    equipped: $equipped\n    priceFrom: $priceFrom\n    priceTo: $priceTo\n    surfaceFrom: $surfaceFrom\n    surfaceTo: $surfaceTo\n    surfaceLandFrom: $surfaceLandFrom\n    surfaceLandTo: $surfaceLandTo\n    ids: $advertId\n    roommate: $roommate\n    includeImports: $includeImports\n    boundaryPoints: $boundaryPoints\n    discountedOnly: $discountedOnly\n    polygonBuffer: $polygonBuffer\n    barrierFree: $barrierFree\n    availableFrom: $availableFrom\n    importType: $importType\n    currency: $currency\n    searchPriceWithCharges: $searchPriceWithCharges\n    lowEnergy: $lowEnergy\n  ) {\n    id\n    uri\n    estateType\n    gps {\n      lat\n      lng\n      __typename\n    }\n    __typename\n  }\n}" }

//SREALITY CAN SEARCH FOR BOTH HOUSES AND FLATS SIMULTANEOUSLY, HENCE NO DISTINCTIONS
const SREALITY_STREDOCESKY_URL = 'https://www.sreality.cz/hledani/prodej/byty,domy/praha,stredocesky-kraj?stav=developerske-projekty%2Cnovostavby%2Cpo-rekonstrukci%2Cvelmi-dobry-stav&cena-do=10500000&plocha-od=90';
const SREALITY_PLZENSKY_URL = 'https://www.sreality.cz/hledani/prodej/byty,domy/plzen,rokycany?stav=developerske-projekty%2Cnovostavby%2Cvelmi-dobry-stav&cena-do=10658046&plocha-od=80'
//KLADNO AREA LANDS ONLY
const SREALITY_KLADNO_URL = 'https://www.sreality.cz/hledani/prodej/pozemky/praha,stredocesky-kraj?cena-do=11000000https://www.sreality.cz/hledani/prodej/pozemky/praha,stredocesky-kraj?cena-do=11000000&lat-max=50.19931965562179&lat-min=50.103515010635334&lon-max=14.167203734026975&lon-min=14.057855436907836';

const IDNES_KLADNO_HOUSES_URL = 'https://reality.idnes.cz/s/prodej/domy/kladno/?s-qc%5Bownership%5D%5B0%5D=personal'
const IDNES_KLADNO_FLATS_URL = 'https://reality.idnes.cz/s/prodej/byty/kladno/?s-qc%5BusableAreaMin%5D=70&s-qc%5Bownership%5D%5B0%5D=personal'
const IDNES_STREDOCESKY_HOUSES_URL = 'https://reality.idnes.cz/s/prodej/domy/cena-do-10500000/?s-l=VUSC-19%3BVUSC-27&s-qc%5BsubtypeHouse%5D%5B0%5D=house&s-qc%5BsubtypeHouse%5D%5B1%5D=turn-key&s-qc%5BsubtypeHouse%5D%5B2%5D=other&s-qc%5BusableAreaMin%5D=70&s-qc%5Bownership%5D%5B0%5D=personal'
const IDNES_STREDOCESKY_FLATS_URL = 'https://reality.idnes.cz/s/prodej/byty/cena-do-10500000/?s-l=VUSC-19%3BVUSC-27&s-qc%5BsubtypeFlat%5D%5B0%5D=4k&s-qc%5BsubtypeFlat%5D%5B1%5D=41&s-qc%5BsubtypeFlat%5D%5B2%5D=5k&s-qc%5BsubtypeFlat%5D%5B3%5D=51&s-qc%5BsubtypeFlat%5D%5B4%5D=6k&s-qc%5BsubtypeFlat%5D%5B5%5D=atypical&s-qc%5BusableAreaMin%5D=70&s-qc%5Bownership%5D%5B0%5D=personal'

let SECRET_CHANNEL_ID;

const originalConsoleError = console.error;
console.error = (message, ...optionalParams) => {
    if (typeof message === 'string' && message.includes('Could not parse CSS stylesheet')) {
        return; // Suppress this specific error
    }
    originalConsoleError(message, ...optionalParams);
};

(async () => {
    await botInit(process.env.DISCORD_TOKEN, process.env.CHANNEL_ID);
    await main();
})();

async function bezRealitky() {
    console.log('bezRealitky init');

    const url = 'https://api.bezrealitky.cz/graphql/';

    let options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(BEZREALITKY_HOUSES_JSON)
    }

    let resultsArr = [];
    let houses = await fetch(url, options);
    houses = await houses.json();
    if (houses.data?.markers) resultsArr = [...resultsArr, ...houses.data.markers];

    options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(BEZREALITKY_FLATS_JSON)
    }

    let flats = await fetch(url, options);
    flats = await flats.json();
    if (flats.data?.markers) resultsArr = [...resultsArr, ...flats.data.markers];

    options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(BEZREALITKY_LANDS_JSON)
    }

    let lands = await fetch(url, options);
    lands = await lands.json();
    if (lands.data?.markers) resultsArr = [...resultsArr, ...lands.data.markers];

    const finalArr = resultsArr.map((listing, i) => ({
        id: listing.id,
        type: listing.estateType,
        url: 'https://www.bezrealitky.cz/nemovitosti-byty-domy/' + listing.uri,
        timestamp: Date.now()
    }));

    return finalArr;
}

async function sReality(page) {
    console.log('sReality init');

    const urlArr = [SREALITY_KLADNO_URL, SREALITY_PLZENSKY_URL, SREALITY_STREDOCESKY_URL];

    let html;
    let listings;
    let arr = [];
    let firstLaunch = true;

    for (let i = 0; i < urlArr.length; i++) {
        await page.goto(urlArr[i]);

        if (firstLaunch) {
            //accept cookies
            //data-testid=cw-button-agree-with-ads
            const element = page.locator('[data-testid="cw-button-agree-with-ads"]');
            await element.click();
            firstLaunch = false;
        }

        await page.waitForTimeout(2000);

        html = await page.content();
        listings = await parseHtml('sreality', html);
        if (listings && listings.length > 0) {
            arr = [...arr, ...listings];
        }

    }

    return arr;
}

async function parseHtml(site, html) {
    // Parse the HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;
    let links;

    if (site === 'sreality') links = document.querySelector('[data-e2e="estates-list"]').querySelectorAll('.MuiTypography-root.MuiTypography-inherit.MuiLink-root.MuiLink-underlineAlways');
    if (site === 'idnes') links = document.querySelectorAll('.c-products__link');

    links = Array.from(links);
    let listings = [];

    for (let i = links.length - 1; i >= 0; i--) {
        //remove ads

        if (site === 'sreality') {
            const hasTip = Array.from(links[0].querySelectorAll('*'))
                .some(el => el.textContent.includes('TIP'));

            if (links[i].href.includes('click?') || links[i].href.includes('projekt-detail') || hasTip) {
                links.splice(i, 1);
                continue;
            }
        }

        if (site === 'idnes') {
            if (links[i].href.includes('/poptavka/prodej') || links[i].href.includes('idnes.czhttps') || links[i].href.includes('chci_prodat')) {
                links.splice(i, 1);
                continue;
            }
        }

        let type;

        if (links[i].href.includes('/pozemek/')) {
            type = 'POZEMEK';
        }

        if (links[i].href.includes('/byt/')) {
            type = 'BYT';
        }

        if (links[i].href.includes('/dum/')) {
            type = 'DUM';
        }

        const match = links[i].href.match(/(?:[a-f0-9]+|\d+)(?=\/?$)/);
        const id = match ? match[0] : null;

        if (site === 'sreality' && !links[i].href.includes('https://sreality.cz')) {
            links[i].href = 'https://sreality.cz' + links[i].href;
        }

        if (site === 'idnes' && !links[i].href.includes('https://reality.idnes.cz')) {
            links[i].href = 'https://reality.idnes.cz' + links[i].href;
        }

        listings.push({ "id": id, "type": type, "url": links[i].href, timestamp: Date.now() });

    }

    return listings;

}

async function iDnes(page) {

    console.log('Idnes init')

    const urlArr = [IDNES_KLADNO_FLATS_URL, IDNES_KLADNO_HOUSES_URL, IDNES_STREDOCESKY_FLATS_URL, IDNES_STREDOCESKY_HOUSES_URL];

    let html;
    let listings;
    let arr = [];

    for (let i = 0; i < urlArr.length; i++) {
        await page.goto(urlArr[i]);

        await page.locator('.paging__item:has-text("2")').scrollIntoViewIfNeeded();

        await page.waitForTimeout(5000);

        html = await page.content();
        listings = await parseHtml('idnes', html);
        if (listings && listings.length > 0) {
            arr = [...arr, ...listings];
        }
    }

    return arr;

}

async function closeBrowserWithTimeout(browser, pid) {
    try {
        // Race browser.close() against a 5s timeout
        await Promise.race([
            browser.close(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('browser.close() timeout')), 5000)
            )
        ]);
    } catch (error) {
        console.log('Force killing due to timeout/failure:', error.message);
        try {
            process.kill(pid, 'SIGKILL'); // Force kill
        } catch (killError) {
            console.log('Kill failed:', killError.message);
        }
    }
}

const STATUS_DEFAULT = 'Sniffing for properties 🐕';

async function botInit(token, channelID) {
    const DISCORD_TOKEN = token;
    SECRET_CHANNEL_ID = channelID;

    bot.login(DISCORD_TOKEN).catch(error => {
        throw error;
    });

    bot.once('ready', () => {
        console.log("BOT IS READY!");
        bot.user.setActivity(STATUS_DEFAULT, { type: ActivityType.Custom });
    });
}

async function launchBrowser() {

    const browserServer = await chromium.launchServer({ headless: true });
    const pid = browserServer.process().pid;
    console.log('Browser PID:', pid);

    const browser = await chromium.connect(browserServer.wsEndpoint());
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    return [browser, page, pid];
}

async function fileData() {

    let existingData = [];
    try {
        const rawData = fs.readFileSync(FILE_PATH, 'utf8');
        existingData = JSON.parse(rawData);
        if (!Array.isArray(existingData)) {
            throw new Error('Invalid JSON structure - expected array');
        }
        return existingData;

    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('Creating new file...');
            fs.createWriteStream('listings.json');
            return [];
        } else {
            console.error('Error reading file:', err.message);
        }
    }
}

async function constructEmbed(listing) {

    const metadata = listing.metadata;
    const url = metadata.url;

    let siteColor = "#ffffff";
    let site;

    if (url.includes('sreality')) {
        siteColor = '#990000';
        site = 'SREALITY 🔴';
    }

    if (url.includes('bezrealitky')) {
        siteColor = '#1f9970';
        site = 'BEZREALITKY 🟢';
    }

    if (url.includes('idnes')) {
        siteColor = '#1d80d7';
        site = 'IDNES 🔵';
    }

    return new Promise(resolve => {

        const embed = new EmbedBuilder();

        embed.setColor(siteColor)
            .setAuthor({ name: site })
            .setURL(metadata.url)
            .setTitle(metadata['og:title'])
            .setImage(metadata['og:image'])
            .setDescription(metadata['og:description'])
            .addFields({ name: 'Google Maps', value: `[HERE 📌](https://www.google.com/maps/search/?api=1&query=${listing.street},${listing.town})` })
        resolve(embed);
    });
}

async function sendEmbed(embed) {
    const channel = bot.channels.cache.get(SECRET_CHANNEL_ID);
    try {
        const webhooks = await channel.fetchWebhooks();
        const webhook = await webhooks.first();

        await webhook.send({
            embeds: [embed]
        });

    } catch (error) {
        console.error('Error trying to send a message: ', error);
    }
}

async function processMetadata(metadata) {

    let obj = {};

    if (metadata.url.includes('sreality')) {
        // Split the string by commas
        const parts = metadata.title.split(',');

        // Get the last two parts, trimming whitespace
        const street = parts[parts.length - 2].trim();
        const town = parts[parts.length - 1].trim();

        // Replace spaces with plus signs
        const streetPlus = street.replace(/\s+/g, '+');
        const townPlus = town.replace(/\s+/g, '+');

        // Create the result object
        obj = {
            street: street,
            town: town
        };

    }

    if (metadata.url.includes('bezrealitky')) {

        // Split by '•' and trim whitespace
        const parts = metadata.title.split('•').map(s => s.trim());

        // Remove trailing non-address parts (like 'bez RK' or '| Bezrealitky')
        while (parts.length && /bez RK|Bezrealitky/i.test(parts[parts.length - 1])) {
            parts.pop();
        }

        let street = '';
        let town = '';

        if (parts.length >= 2) {
            // The last part is usually the town, the one before it is the street (if not a town itself)
            town = parts[parts.length - 1];
            // Heuristic: if the second-to-last part contains spaces or diacritics, treat as street, else may be town
            street = parts[parts.length - 2];

            // If street and town are the same, or street is likely not a street (e.g. only one address part), clear street
            if (street === town || parts.length === 2) {
                street = '';
            }
        } else if (parts.length === 1) {
            town = parts[0];
            street = '';
        }

        // Replace spaces with plus signs
        street = street.replace(/\s+/g, '+');
        town = town.replace(/\s+/g, '+');

        obj = {
            street: street,
            town: town
        };

    }

    if (metadata.url.includes('idnes')) {

        // Get the part before "okres" or before the first period
        let locPart = metadata.description.split('okres')[0].split('.')[0];

        // Split by commas and trim whitespace
        const parts = locPart.split(',').map(s => s.trim()).filter(Boolean);

        // If there are at least two parts, assume the last two are street and town
        let street = '';
        let town = '';

        if (parts.length >= 2) {
            street = parts[parts.length - 2];
            town = parts[parts.length - 1];
        } else if (parts.length === 1) {
            // Sometimes only a town is present
            town = parts[0];
        }

        // Replace spaces with plus signs
        street = street.replace(/\s+/g, '+');
        town = town.replace(/\s+/g, '+');

        obj = {
            street: street,
            town: town
        };
    }

    return obj;
}

async function main() {
    try {

        let listingsFileData = await fileData();

        if (listingsFileData && listingsFileData.length > 0) {

            let bezrealitky = await bezRealitky();

            const [browser, page, pid] = await launchBrowser();

            let sreality = await sReality(page);
            let idnes = await iDnes(page);

            const mergedListings = [...bezrealitky, ...sreality, ...idnes];
            console.log(mergedListings.length);
            //compare against existing dataset

            for (let i = 0; i < mergedListings.length; i++) {
                if (!mergedListings[i].metadata) {
                    let result = await urlMetadata(mergedListings[i].url);
                    mergedListings[i].metadata = {
                        url: result['og:url'],
                        title: result['og:title'],
                        site_name: result['og:site_name'],
                        description: result['og:description'],
                        image: result['og:image']
                    }
                    //processing metadata for street and town name
                    try {
                        const processed = await processMetadata(mergedListings[i].metadata);
                        //console.log(mergedListings[i].url.substring(0,25) + ' ' + JSON.stringify(processed))
                        mergedListings[i] = { ...mergedListings[i], ...processed };
                    }
                    catch (error) {
                        console.log('Failed to process metadata: ', error);
                    }
                }

            }


            const existingMap = new Map(listingsFileData.map(item => [item.id, item]));

            // 2. Prepare arrays for new and updated listings
            const toNotify = [];
            const updatedDataMap = new Map(existingMap); // Start with all existing

            for (const listing of mergedListings) {
                const existing = existingMap.get(listing.id);
                if (!existing) {
                    // Not in DB, it's new
                    toNotify.push(listing);
                    updatedDataMap.set(listing.id, listing);
                }
                else if (!existingMap.get(listing.metadata)) {
                    updatedDataMap.set(listing.id, listing); //missing metadata so we replace it with fresh set
                }
                else {
                    // Exists, check timestamp
                    const oldTime = new Date(existing.timestamp).getTime();
                    const newTime = new Date(listing.timestamp).getTime();
                    if (newTime - oldTime >= ONE_DAY_MS) {
                        // At least 1 day newer, treat as new/updated
                        toNotify.push(listing);
                        updatedDataMap.set(listing.id, listing); // Replace with fresher
                    }
                    // Else: skip, it's not significantly newer
                }
            }

            // 3. Notify about new or updated listings
            console.log(`Added ${toNotify.length} new listings:`);

            // 4. Save updated unique listings (as array)
            const uniqueById = Array.from(updatedDataMap.values());
            fs.writeFileSync(FILE_PATH, JSON.stringify(uniqueById, null, 2));
            console.log(toNotify.map(l => `- ${l.id}: ${l.url}`).join('\n'));

            for (const listing of toNotify) {
                console.log(listing.url)
                const embed = await constructEmbed(listing);
                await sendEmbed(embed);
            }

            await closeBrowserWithTimeout(browser, pid);
        }
    }
    catch (error) {
        console.log('Main Error:', error);
    }

}

const job = new cron.CronJob("0 0 * * * *", async () => {
    await main();
    console.log(`cron job @ ${new Date()}}`);
});

job.start();



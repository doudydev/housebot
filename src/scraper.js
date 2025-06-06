'use strict';

require('dotenv').config();

const fs = require('fs');
const { chromium } = require('patchright');
const cron = require("cron");
const urlMetadata = require('url-metadata');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
//LOCAL FILES
const discord = require('./discord.js');
const maps = require('./maps.js');
const config = require('../data/config.json');

const MAX_LISTING_PRICE = config.max_listing_price;
const ENABLE_ROUTES = config.routes.enable_routes;
const IDNES_URLS = config.idnes_urls;
const SREALITY_URLS = config.sreality_urls;
const BEZREALITKY_URLS = config.bezrealitky_urls;
const CESKEREALITY_URLS = config.ceskereality_urls;

const FILE_PATH = './data/listings.json';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let main_is_running = false;

const originalConsoleError = console.error;
console.error = (message, ...optionalParams) => {
    if (typeof message === 'string' && message.includes('Could not parse CSS stylesheet')) {
        return; // Suppress this specific error
    }
    originalConsoleError(message, ...optionalParams);
};

(async () => {
    await discord.botInit();
    await main();
})();

async function bezRealitky() {
    console.log('bezRealitky init');

    const jsonArr = BEZREALITKY_URLS;

    let listings;
    let resultsArr = [];

    const url = 'https://api.bezrealitky.cz/graphql/';

    for (let i = 0; i < jsonArr.length; i++) {

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jsonArr[i])
        }

        let data = await fetch(url, options);
        listings = await data.json();
        if (listings.data?.markers) resultsArr = [...resultsArr, ...listings.data.markers.slice(0, 25)];
    }

    const finalArr = resultsArr.map((listing, i) => ({
        id: listing.id,
        type: listing.estateType,
        url: 'https://www.bezrealitky.cz/nemovitosti-byty-domy/' + listing.uri,
        timestamp: Date.now()
    }));

    return finalArr;
}

async function sReality(page) {

    try {
        console.log('sReality init');

        const urlArr = SREALITY_URLS;

        let html;
        let listings;
        let arr = [];
        let firstLaunch = true;

        for (let i = 0; i < urlArr.length; i++) {

            await page.goto(urlArr[i], {waitUntil: "networkidle"});

            if (firstLaunch) {
                const element = await page.locator('[data-testid="cw-button-agree-with-ads"]');
                await element.click();
                firstLaunch = false;
            }

            await page.waitForTimeout(5000);

            html = await page.content();
            listings = await parseHtml('sreality', html);
            if (listings && listings.length > 0) {
                arr = [...arr, ...listings];
            }

        }

        return arr;
    }
    catch (error) {
        console.log('sReality error:', error);
        return [];
    }

}

async function iDnes(page) {

    try {
        console.log('Idnes init')

        const urlArr = IDNES_URLS;

        let html;
        let listings;
        let arr = [];

        for (let i = 0; i < urlArr.length; i++) {
            await page.goto(urlArr[i]);

            await page.waitForTimeout(2500);

            await page.locator('.paging__item:has-text("2")').scrollIntoViewIfNeeded();

            await page.waitForTimeout(2500);

            html = await page.content();
            listings = await parseHtml('idnes', html);
            if (listings && listings.length > 0) {
                arr = [...arr, ...listings];
            }
        }

        return arr;
    }
    catch (error) {
        console.log('iDnes failed:', error);
        return [];
    }

}

async function ceskeReality(page) {

    try {
        console.log('ceskeReality init')

        const urlArr = CESKEREALITY_URLS;

        let html;
        let listings;
        let arr = [];

        for (let i = 0; i < urlArr.length; i++) {
            await page.goto(urlArr[i]);

            await page.waitForTimeout(5000);

            html = await page.content();
            listings = await parseHtml('ceskereality', html);
            if (listings && listings.length > 0) {
                arr = [...arr, ...listings];
            }
        }

        return arr;
    }
    catch (error) {
        console.log('ceskeReality error:', error)
        return [];
    }

}

async function parseHtml(site, html) {
    // Parse the HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;
    let links;
    let ceskereality_prices;

    if (site === 'sreality') links = document.querySelector('[data-e2e="estates-list"]')?.querySelectorAll('.MuiTypography-root.MuiTypography-inherit.MuiLink-root.MuiLink-underlineAlways');
    if (site === 'idnes') links = document.querySelectorAll('.c-products__link');
    if (site === 'ceskereality') {
        links = document.querySelectorAll('.i-estate__image-link');
        ceskereality_prices = Array.from(document.querySelectorAll('.i-estate__footer-price-value'));
    }

    if (!links) {
        throw new Error('Links is empty!');
    }

    links = Array.from(links);
    let listings = [];

    for (let i = links.length - 1; i >= 0; i--) {
        //remove ads

        if (site === 'sreality') {
            const hasTip = Array.from(links[0].querySelectorAll('*'))
                .some(el => el.textContent.includes('TIP'));

            if (links[i].href.includes('click?') ||
                links[i].href.includes('projekt-detail') ||
                links[i].href.includes('sreality.czhttps') ||
                links[i].href.includes('adresar') ||
                links[i].href.includes('makleri') ||
                hasTip) {
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

        if (links[i].href.includes('/byt/') || links[i].href.includes('/byty/')) {
            type = 'BYT';
        }

        if (links[i].href.includes('/dum/') || links[i].href.includes('/rodinne-domy/')) {
            type = 'DUM';
        }

        const match = links[i].href.match(/(?:[a-f0-9]+|\d+)(?=(?:\.html)?\/?$)/);
        const id = match ? match[0] : null;

        if (site === 'sreality' && !links[i].href.includes('https://sreality.cz')) {
            links[i].href = 'https://sreality.cz' + links[i].href;
        }

        if (site === 'idnes' && !links[i].href.includes('https://reality.idnes.cz')) {
            links[i].href = 'https://reality.idnes.cz' + links[i].href;
        }

        if (site === 'ceskereality' && !links[i].href.includes('hhttps://stredo.ceskereality.cz')) {
            links[i].href = 'https://stredo.ceskereality.cz' + links[i].href;
        }

        let obj = {
            "id": id,
            "type": type,
            "url": links[i].href,
            timestamp: Date.now(),
        }

        if (ceskereality_prices) {
            obj.price = Number(ceskereality_prices[i].textContent.replace(/Kč/g, '').replace(/\s/g, ''));
        }

        listings.push(obj);

    }

    return listings;

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

async function launchBrowser(headless = true) {

    let argsArr = [
        "--display=:0.1"  // specify the display to use for the new window
    ]

    const browserServer = await chromium.launchServer({ headless: headless, args: argsArr });

    const pid = browserServer.process().pid;
    console.log('Browser PID:', pid);

    const browser = await chromium.connect(browserServer.wsEndpoint());
    const page = await browser.newPage();

    if (!headless) {
        await page.setViewportSize({ width: 1920, height: 1080 });
    }
    else {
        await page.setViewportSize({ width: 480, height: 320 });
    }


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
            fs.createWriteStream(FILE_PATH);
            return [];
        } else {
            console.error('Error reading file:', err.message);
        }
    }
}

async function processMetadata(metadata) {

    let obj = {};

    if (metadata.url.includes('sreality')) {

        // Split the string by commas
        const parts = metadata.title.split(',');

        // Get the last two parts, trimming whitespace
        const street = parts[parts.length - 2]?.trim();
        const town = parts[parts.length - 1]?.trim();

        // Replace spaces with plus signs
        const streetPlus = street?.replace(/\s+/g, '+');
        const townPlus = town?.replace(/\s+/g, '+');

        // Create the result object
        let price;
        const match = metadata.description.match(/; (.*?Kč)/);
        if (match) price = Number(match[1].replace(/\s|Kč/gm, ''));

        obj = {
            price: price,
            street: streetPlus,
            town: townPlus
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

        let price;
        const match = metadata.description.match(/\d{1,3}(?: \d{3})* Kč/);
        if (match) price = Number(match[0].replace(/\s|Kč/gm, ''));

        obj = {
            price: price,
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

        let price;
        const match = metadata.description.match(/\d{1,3}(?: \d{3})* Kč/);
        if (match) price = Number(match[0].replace(/\s|Kč/gm, ''));

        obj = {
            price: price,
            street: street,
            town: town
        };
    }

    if (metadata.url.includes('ceskereality')) {
        // Extract location from title - format appears to be "Prodej bytu 3+kk, 71 m², Beroun, ulice Nepilova, okres Beroun"
        const titleParts = metadata.title.split(',').map(part => part.trim());

        let street = '';
        let town = '';

        // Look for the part that contains "ulice" (street)
        for (let i = 0; i < titleParts.length; i++) {
            if (titleParts[i].includes('ulice')) {
                street = titleParts[i].replace('ulice', '').trim();
                // Check if the previous part is likely the town
                if (i > 0 && !titleParts[i - 1].includes('m²')) {
                    town = titleParts[i - 1];
                }
                break;
            }
        }

        // If street wasn't found with "ulice", try to find town and street based on position
        if (!street && titleParts.length > 2) {
            // Skip property type and size parts, look for location info
            for (let i = 2; i < titleParts.length; i++) {
                const part = titleParts[i];
                if (!part.includes('m²') && !part.includes('okres')) {
                    if (!town) {
                        town = part;
                    } else if (!street && !part.includes('okres')) {
                        street = part;
                    }
                }
            }
        }

        // Replace spaces with plus signs
        street = street.replace(/\s+/g, '+');
        town = town.replace(/\s+/g, '+');

        //price already extracted in html
        obj = {
            street: street,
            town: town
        };
    }

    if (obj.street?.includes('m²') || obj.street?.includes('pozemek')) obj.street = undefined;
    if (obj.town?.includes('m²')) obj.street = undefined;

    return obj;
}

async function main() {
    try {

        main_is_running = true;

        if (ENABLE_ROUTES) await maps.setDepartureTime();

        let listingsFileData = await fileData();

        if (listingsFileData && listingsFileData.length > 0) {

            const [browser, page, pid] = await launchBrowser();

            let sreality = await sReality(page);

            //sreality failed to fetch headful, try ts curl
            if (sreality && sreality.length === 0) {
                try {
                    //alternate browser to try and fetch the thing on a proxy
                    console.log('Attempting to fetch Sreality through headful.');
                    const [browser, page, pid] = await launchBrowser(false);
                    const cdpSession = await page.context().newCDPSession(page);
                    const window_info = await cdpSession.send('Browser.getWindowForTarget', {})
                    const window_id = window_info['windowId']
                    cdpSession.send('Browser.setWindowBounds', {'windowId': window_id, 'bounds': {'windowState': 'minimized'}})
                    sreality = await sReality(page);
                    await closeBrowserWithTimeout(browser, pid);
                }
                catch (error) {
                    console.log('Failed to fetch fallback Sreality! ', error);
                }
            }

            let bezrealitky = await bezRealitky();

            let idnes = await iDnes(page);

            let ceskereality = await ceskeReality(page);

            console.log('BZ ', bezrealitky.length);
            console.log('SR ', sreality.length);
            console.log('ID ', idnes.length);
            console.log('CR ', ceskereality.length);

            const mergedListings = [...bezrealitky, ...sreality, ...idnes, ...ceskereality];
            let uniqueListings = mergedListings.filter((listing, index, array) => {
                return array.findIndex(item => item.id === listing.id) === index;
            });

            for (let i = 0; i < uniqueListings.length; i++) {
                let result = await urlMetadata(uniqueListings[i].url);
                uniqueListings[i].metadata = {
                    url: result['og:url'],
                    title: result['og:title'],
                    site_name: result['og:site_name'],
                    description: (uniqueListings[i].url.includes('ceskereality')) ? result.jsonld[0]?.description.substring(0, 264) : result['og:description'],
                    image: result['og:image']
                }

                //processing metadata for street and town name
                try {
                    const processed = await processMetadata(uniqueListings[i].metadata);
                    uniqueListings[i] = { ...uniqueListings[i], ...processed };
                }
                catch (error) {
                    console.log('Failed to process metadata: ', error);
                }
            }

            //exclude družstevní byty in praha and all listing under max price
            //max price is set only for edge cases where a listing may slip aside from the provided URL parameters set
            uniqueListings = uniqueListings.filter(listing => {
                const desc = listing.metadata?.description?.toLowerCase();

                // Keep the listing if any of these are true:
                // 1. No metadata/description exists
                // 2. Doesn't contain "anuit" + excluded terms
                return !(
                    desc &&
                    desc.includes('anuit') ||
                    ((desc.includes('praha') || desc.includes('praze')) && desc.includes('družst')) &&
                    listing.price <= MAX_LISTING_PRICE
                );
            });

            //compare against dataset
            const existingMap = new Map(listingsFileData.map(item => [item.id, item]));

            // 2. Prepare arrays for new and updated listings
            const toNotify = [];
            const updatedDataMap = new Map(existingMap); // Start with all existing

            for (let i = 0; i < uniqueListings.length; i++) {
                const existing = existingMap.get(uniqueListings[i].id);

                if (!existing) {
                    // Not in DB, it's new
                    uniqueListings[i].status = 'NEW';

                    if (ENABLE_ROUTES) {
                        const routes = await maps.checkExistingRoutes(uniqueListings[i], listingsFileData);

                        if (routes) {
                            console.log('Route already in DB.');
                            uniqueListings[i].routes = routes;
                        }
                        else {
                            uniqueListings[i].routes = await maps.getRoutes(uniqueListings[i]);
                        }
            
                    }
                    toNotify.push(uniqueListings[i]);
                    //get routing to airport + hometown
                    updatedDataMap.set(uniqueListings[i].id, uniqueListings[i]);
                }
                else if (!existingMap.get(uniqueListings[i].metadata)) {
                    updatedDataMap.set(uniqueListings[i].id, uniqueListings[i]); //missing metadata so we replace it with fresh set
                }
                else {
                    //so far no reposted listings, is this a bug or is the sample size too small?
                    uniqueListings[i].status = 'REPOST';
                    // Exists, check timestamp
                    const oldTime = new Date(existing.timestamp).getTime();
                    const newTime = new Date(uniqueListings[i].timestamp).getTime();
                    const oldPrice = existing.price;
                    if ((uniqueListings[i].url.includes('bezrealitky') && (newTime - oldTime >= ONE_DAY_MS * 2)) ||
                        (!uniqueListings[i].url.includes('bezrealitky') && (newTime - oldTime >= ONE_DAY_MS))
                    ) {

                        if (uniqueListings[i].price < oldPrice) {
                            uniqueListings[i].status = 'PRICE';

                            if (!uniqueListings[i].price_history) {
                                uniqueListings[i].price_history = [];
                            }

                            //check if latest added price is the same, then just shift it, then insert lower/higher price in
                            if (uniqueListings[i].price_history.length > 0) {
                                if (uniqueListings[i].price === uniqueListings[i].price_history[0].price) {
                                    uniqueListings[i].price_history.shift();
                                }
                            }

                            //element is inserted into beginning of array
                            uniqueListings[i].price_history.unshift({ price: processedObj.price, timestamp: Date.now() });

                        }

                        if (ENABLE_ROUTES &&
                            (!existing.routes ||
                                (!existing.routes?.distance && !existing.routes?.time)
                            )
                        ) {
                            const routes = await maps.checkExistingRoutes(uniqueListings[i], listingsFileData);

                            if (routes) {
                                console.log('Route already in DB.');
                                uniqueListings[i].routes = routes;
                            }
                            else {
                                uniqueListings[i].routes = await maps.getRoutes(uniqueListings[i]);
                            }
                        }

                        // At least 1 day newer, treat as new/updated
                        toNotify.push(uniqueListings[i]);
                        updatedDataMap.set(uniqueListings[i].id, uniqueListings[i]); // Replace with fresher
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
                const embed = await discord.constructEmbed(listing);
                await discord.sendEmbed(embed);
            }

            await closeBrowserWithTimeout(browser, pid);

            main_is_running = false;
        }
    }
    catch (error) {
        console.log('Main Error:', error);
        main_is_running = false;
    }

}

//cronjob to run every hour fetching new listings
const job = new cron.CronJob("0 0 * * * *", async () => {
    if (!main_is_running) {
        await main();
        console.log(`cron job @ ${new Date()}}`);
    }
    else {
        console.log(`cron job failed - main is running already @ ${new Date()}}`);
    }

});

job.start();



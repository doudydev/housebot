'use strict';

require('dotenv').config();
const config = require('../data/config.json');

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const ORIGIN_COUNTRY = 'Czechia';

async function getNextMonday() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Days until next Monday (if today is Monday, we want next Monday)
    const daysToAdd = day === 1 ? 7 : (8 - day) % 7;

    // Set to next Monday
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysToAdd);

    // Set time to 6:00 AM
    nextMonday.setHours(8, 0, 0, 0);

    return nextMonday;
}

// Get the proper departure time
let DEPARTURE_TIME;

// Check if the configured date is in the future
async function setDepartureTime() {
    const configDate = new Date(config.routes.simulated_date);
    const now = new Date();

    if (configDate > now) {
        // If the configured date is still in the future, use it
        console.log("Using configured future date:", config.routes.simulated_date);
        DEPARTURE_TIME = config.routes.simulated_date;
    } else {
        // If the date has passed, get next Monday at 6 AM
        const nextMonday = await getNextMonday();
        DEPARTURE_TIME = nextMonday.toISOString();
        console.log("Configured date has passed. Using next Monday at 6 AM:", DEPARTURE_TIME);
    }
}

//checks if google has calculated a route already to cut down on api calls
async function checkExistingRoutes(listing, listingsArray) {

    const matchingProperties = listingsArray.filter(property => {
        // Check if property has street and town properties matching query
        const streetMatch = property.street === listing.street;
        const townMatch = property.town === listing.town;

        // Check if routes property exists and is an array
        const hasRoutes = property.routes && Array.isArray(property.routes) && property.routes.length > 0;

        // Return true only if all conditions are met
        return streetMatch && townMatch && hasRoutes;
    });

    if (matchingProperties.length > 0) {
        return matchingProperties[0].routes;
    }

    // Return null if no matches found
    return null;
}

async function getRoutes(origin) {

    if (!process.env.GOOGLE_APIKEY) {
        throw new Error('Google API Key is required to perform this action!');
    }

    const destinations = config.routes.destinations;
    //origin must include street, town, country
    let routes = [];

    //in case no street was provided
    if (!origin.street) origin.street = '';

    for (let i = 0; i < destinations.length; i++) {

        const [kilometers, time] = await routeSubroutine(origin, destinations[i]);

        //console.log(`${kilometers} , ${time}`)

        let object = {
            origin: {
                street: origin.street,
                town: origin.town,
            },
            destination: {
                street: destinations[i].street,
                town: destinations[i].town,
                emoji: destinations[i].emoji
            },
            distance: kilometers,
            time: time
        }

        routes.push(object)

    }

    return routes;
}

async function routeSubroutine(origin, destination) {

    const jsonData = {
        "origin": {
            "address": `${origin.street}, ${origin.town}, ${ORIGIN_COUNTRY}`
        },
        "destination": {
            "address": `${destination.street}, ${destination.town}, ${ORIGIN_COUNTRY}`
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "departureTime": DEPARTURE_TIME,
        "computeAlternativeRoutes": false,
        "routeModifiers": {
            "avoidTolls": false,
            "avoidHighways": false,
            "avoidFerries": false
        },
        "languageCode": "en-US",
        "units": "METRIC"
    }

    const options = {
        method: 'POST',
        body: JSON.stringify(jsonData),
        headers: {
            'X-Goog-Api-Key': process.env.GOOGLE_APIKEY,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
            'Content-Type': 'application/json'
        }
    }

    try {
        const response = await fetch(ENDPOINT, options);

        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            return [null, null];
        }

        const data = await response.json();
        console.log("API Called"); // Debug log

        if (data?.routes?.length > 0) {
            const route = data.routes[0];

            // Handle different duration formats
            let totalSeconds;
            if (typeof route.duration === 'object' && route.duration.seconds) {
                // If duration is an object with seconds property
                totalSeconds = Number(route.duration.seconds);
            } else if (typeof route.duration === 'string' && route.duration.endsWith('s')) {
                // If duration is a string like "123s"
                totalSeconds = Number(route.duration.replace('s', ''));
            } else if (typeof route.duration === 'number') {
                // If duration is directly a number
                totalSeconds = route.duration;
            } else {
                console.error("Unexpected duration format:", route.duration);
                return [null, null];
            }

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            let time;
            if (hours > 0) {
                time = `${hours}h ${minutes}m ${seconds}s`;
            } else {
                time = `${minutes}m ${seconds}s`;
            }

            const distanceMeters = Number(route.distanceMeters);
            if (isNaN(distanceMeters)) {
                console.error("Invalid distance value:", route.distanceMeters);
                return [null, null];
            }

            const kilometers = (distanceMeters / 1000).toFixed(2) + 'km';

            return [kilometers, time];
        } else {
            console.error("No routes found in API response:", data);
            return [null, null];
        }
    } catch (error) {
        console.error("Error in routeSubroutine:", error);
        return [null, null];
    }
}


module.exports = {
    setDepartureTime,
    getRoutes,
    checkExistingRoutes
}
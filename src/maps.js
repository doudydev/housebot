'use strict';

require('dotenv').config();

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const COUNTRY = 'Czechia';
const DEPARTURE_TIME = "2025-05-05T06:00:00Z"; //routes on a monday morning

async function getRoutes(origin) {

    if (!process.env.GOOGLE_APIKEY) {
        throw new Error('Google API Key is required to perform this action!');
    }

    const destinations = [{ street: "Aviatická", town: "Praha 6" }, { street: "Sokolovská 483/100", town: "Karlovy Vary 5" }]
    //origin must include street, town, country
    let routes = [];

    //in case no street was provided
    if (!origin.street) origin.street = '';

    destinations.forEach(async (destination) => {

        const [kilometers, time] = await routeSubroutine(origin, destination);

        routes.push({
            origin: {
                street: origin.street,
                town: origin.town
            },
            destination: {
                street: destination.street,
                town: destination.town
            },
            distance: kilometers,
            time: time
        })

    });

    return routes;
}

async function routeSubroutine(origin, destination) {

    const jsonData = {
        "origin": {
            "address": `${origin.street}, ${origin.town}, ${COUNTRY}`
        },
        "destination": {
            "address": `${destination.street}, ${destination.town}, ${COUNTRY}`
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

    const response = await fetch(ENDPOINT, options);
    const data = await response.json();
    if (data?.routes?.length > 0) {
        const route = data.routes[0]; // Store the route in a variable
        const totalSeconds = Number(route.duration.replace('s', '')); // Remove 's' from duration string
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const time = `${hours}h ${minutes}m ${seconds}s`;
        const kilometers = (route.distanceMeters / 1000).toFixed(2) + 'km'; // Use route.distanceMeters, not data.routes.distanceMeters
        return [kilometers, time];
    }
}


module.exports = {
    getRoutes
}
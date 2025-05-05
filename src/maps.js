'use strict';

require('dotenv').config();
const config = require('../data/config.json');

const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const ORIGIN_COUNTRY = 'Czechia';
const DEPARTURE_TIME = config.routes.simulated_date; //routes on a monday morning

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

        routes.push({
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
        })

    }

    return routes;
}

async function routeSubroutine(origin, destination) {

    const jsonData = {
        "origin": {
            "address": `${origin.street}, ${origin.town}, ${ORIGIN_COUNTRY}`
        },
        "destination": {
            "address": `${destination.street}, ${destination.town}, ${destination.country}`
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

        let time; 
        if (hours > 0) {
            time = `${hours}h ${minutes}m ${seconds}s`;
        }
        else {
            time = `${minutes}m ${seconds}s`; 
        }

        const kilometers = (route.distanceMeters / 1000).toFixed(2) + 'km'; // Use route.distanceMeters, not data.routes.distanceMeters
        return [kilometers, time];
    }
    else {
        return [null, null];
    }
}


module.exports = {
    getRoutes
}
'use strict';

require('dotenv').config();

const { Client, ActivityType, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions] });

let SECRET_CHANNEL_ID;

const STATUS_DEFAULT = 'Sniffing for properties 🐕';

async function botInit() {
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    SECRET_CHANNEL_ID = process.env.CHANNEL_ID;

    bot.login(DISCORD_TOKEN).catch(error => {
        throw error;
    });

    bot.once('ready', () => {
        console.log("BOT IS READY!");
        bot.user.setActivity(STATUS_DEFAULT, { type: ActivityType.Custom });
    });
}

async function constructEmbed(listing) {

    if (!process.env.DISCORD_TOKEN || !process.env.CHANNEL_ID) {
        throw new Error('Missing Discord Token or Channel ID!');
    }

    const metadata = listing.metadata;
    const url = metadata.url;

    let status = listing.status;
    //status assignment
    if (listing.status === 'PRICE') status = 'SLEVA';
    if (listing.status === 'NEW') status = 'NOVÝ';

    let siteColor = "#ffffff";
    let site = `[${status}] `;

    if (url.includes('sreality')) {
        siteColor = '#990000';
        site += `SREALITY 🔴`;
    }

    if (url.includes('bezrealitky')) {
        siteColor = '#1f9970';
        site += `BEZREALITKY 🟢 `;
    }

    if (url.includes('idnes')) {
        siteColor = '#1d80d7';
        site += `IDNES 🔵`;
    }

    if (url.includes('ceskereality')) {
        siteColor = '#81ecec';
        site += `CESKEREALITY 🔵`;
    }

    //form query
    let fieldsArr = [];

    if (listing.price) fieldsArr.push({ name: 'Cena', value: `${listing.price.toLocaleString('fr-FR')} Kč` });

    let query;

    if (listing.street && listing.town) {
        query = listing.street + ',' + listing.town;
    }
    else {
        query = listing.town;
    }

    fieldsArr.push({ name: 'Mapy 📌', value: `[ZDE](https://www.google.com/maps/search/?api=1&query=${query})`, inline: true });

    for (let i = 0; i < listing.routes.length; i++) {

        const route = listing.routes[i];

        if (route.distance && route.time) {

            let town = route.destination.town;

            if (town.includes('Praha')) {
                town = 'PRG'
            }
            else if (town.includes('Karlovy Vary')) {
                town = 'KV'
            }
            else {
                town = await abbreviateTown(route);
            }
    
            const emoji = (route.destination.emoji) ? route.destination.emoji : '';
            fieldsArr.push({ name: `Cesta do ${town} ${emoji}`, value: `${route.distance} | ${route.time}`, inline: true });
        }
    }

    return new Promise(resolve => {

        const embed = new EmbedBuilder();

        embed.setColor(siteColor)
            .setAuthor({ name: site })
            .setURL(metadata.url)
            .setTitle(metadata.title)
            .setImage(metadata.image)
            .setDescription(metadata.description)
            .setTimestamp();

        for (const field of fieldsArr) {
            embed.addFields({ name: field.name, value: field.value, inline: field.inline });
        }

        resolve(embed);
    });
}

async function sendEmbed(embed) {
    const channel = bot.channels.cache.get(SECRET_CHANNEL_ID);
    try {
        const webhooks = await channel.fetchWebhooks();
        const webhook = await webhooks.first();

        if (webhook) {
            await webhook.send({
                embeds: [embed]
            });
        }
        else {
            console.error('No Webhook present! Please set one up!');
        }

    } catch (error) {
        console.error('Error trying to send a message: ', error);
    }
}

async function abbreviateTown(route) {
    const town = route.town || '';
    const words = town.split('+').filter(Boolean); // Split by '+' and remove empty
    if (words.length >= 2) {
        // Take the first character of each word (including '-' if it's the first character)
        return words.map(word => word[0]).join('');
    } else {
        return town;
    }
}

module.exports = {
    constructEmbed,
    sendEmbed,
    botInit
}
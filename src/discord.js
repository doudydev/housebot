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

    const metadata = listing.metadata;10
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

    //form query
    let fieldsArr = [];

    let extractedPrice;

    if (!url.includes('sreality')) {
        extractedPrice = metadata.description.match(/\d{1,3}(?: \d{3})* Kč/);
    }
    else {
        //breaking chars in the price
        extractedPrice = metadata.description.match(/; (.*?Kč)/)[1];
    }

    if (extractedPrice) fieldsArr.push({ name: 'Cena', value: `${extractedPrice}` });

    let query;

    if (listing.street && listing.town) {
        query = listing.street + ',' + listing.town;
    }
    else {
        query = listing.town;
    }

    fieldsArr.push({ name: 'Google Maps', value: `[HERE 📌](https://www.google.com/maps/search/?api=1&query=${query})`, inline: true})

    if (listing.routes && listing.routes[0]) {
        fieldsArr.push({ name: 'Cesta do PRG ✈️', value: `${listing.routes[0].distance} | ${listing.routes[0].time}`, inline: true });
        fieldsArr.push({ name: 'Cesta do KV 🏠', value: `${listing.routes[1].distance} | ${listing.routes[1].time}`, inline: true });
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

        await webhook.send({
            embeds: [embed]
        });

    } catch (error) {
        console.error('Error trying to send a message: ', error);
    }
}

module.exports = {
    constructEmbed,
    sendEmbed,
    botInit
}
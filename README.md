# House Bot 🏠

Personal project that aggregates Czech property sites and reports on new/modified listings of properties and propagates these changes to a discord channel.

## Dependencies
Node v20+   
CLI     

## Usage
Clone the repo     
Install dependencies with npm i     
For discord populate env with DISCORD_TOKEN and CHANNEL_ID and set up a Webhook for the given CHANNEL_ID
If you would like routing options, set up a GOOGLE_APIKEY env variable with your Maps API key   
In config.json provide URLs and Graph API params to call upon desired listings in each site     
Execute npm run start   

## To-Do

- Fix listing status tags 
- Consider individual listings crawling for details
- Look into limiting Maps API calls to not exceed Free Tier
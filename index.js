const airtable = require('airtable')
const got = require('got');
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const lodash = require('lodash');
const {IgApiClient} = require('instagram-private-api');

const dayFromWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

exports.weather = async payload => {

    const darkSkyUrl = `https://api.darksky.net/forecast/${process.env.weatherApiKey}/${process.env.longitude},${process.env.latitude}?exclude=minutely,flags`;
    const response = await got.get(darkSkyUrl);
    const weatherData = JSON.parse(response.body);

    if (process.env.airtableKey && process.env.airtableBase) {
        const base = new airtable({apiKey: process.env.airtableKey}).base(process.env.airtableBase);
        await base('Weather').create({
            Date: new Date(),
            Summary: weatherData.currently.summary,
            Temperature: weatherData.currently.temperature
        });
    }

    const html = fs.readFileSync('template.html');
    let template = handlebars.compile(html.toString());
    const now = new Date();

    const content = template({
        day: dayFromWeek[now.getDay()],
        date: now.getDate(),
        ordinal: ordinal(now.getDate()),
        month: month[now.getMonth()],
        weather: weatherData.hourly.summary,
        icon: iconToFAName(weatherData.hourly.icon),
        location: process.env.location
    });

    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        headless: false
    });

    let page = await browser.newPage();

    await page.setViewport({
        width: 500,
        height: 500,
        deviceScaleFactor: 2,
    });

    await page.setContent(content, {waitUntil: 'networkidle0'});
    await page.waitFor(500);
    const image = await page.screenshot({type: "jpeg", quality: 100});
    // await browser.close();

    // const ig = new IgApiClient();

    // ig.state.generateDevice(process.env.instagramUsername);
    // await ig.account.login(process.env.instagramUsername, process.env.instagramPassword);

    // const caption = `Weather will be: ${weatherData.hourly.summary} \n\n\n Tags: ${lodash.shuffle(JSON.parse(process.env.tags), 10).map(x => '#' + x).join(' ')}`

    // const publishResult = await ig.publish.photo({
    //     file: image,
    //     location: (await ig.search.location(process.env.latitude, process.env.longitude, process.env.location))[0],
    //     caption
    // });

    // await ig.account.logout();

    // return JSON.stringify(publishResult);
}

if (require.main === module) {
    require('dotenv').config();
    exports.weather({data: "none"}).catch(console.error);
}

function ordinal(number) {
    switch (number) {
        case 1:
        case 21:
        case 31:
            return 'st';
        case 2:
        case 22:
            return 'nd';
        case 3:
        case 23:
            return 'rd';
        default:
            return 'th';
    }
}

function iconToFAName(icon) {
    //clear-day, rain, snow, sleet, wind, fog, cloudy, partly-cloudy-day
    switch (icon) {
        case 'clear-day': return 'sun';
        case 'rain': return 'cloud-rain';
        case 'snow': return 'snowflake';
        case 'sleet': return 'snowflake';
        case 'wind': return 'wind';
        case 'fog': return 'smog';
        case 'cloudy': return 'cloud';
        default: return 'cloud';
    }
}
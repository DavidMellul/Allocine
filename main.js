const puppeteer = require('puppeteer');
const rls = require('readline-sync');
const normalize = require('./normalize.js');

// Imrpove global performances by aborting download of those resources
let blockedResourceTypes = [
	'image',
	'stylesheet',
	'media',
	'font',
	'manifest',
	'other',
	'websocket',
	'script'
];

// Cool alias
const sugar = (data = ' ') => process.stdout.write(data);
const honey = (data = ' ') => console.log(data);

(async () => {
	// Run browser with a new tab
	const browser = await puppeteer.launch({
		headless: true
	});
	const tab = await browser.newPage();

	// Improve performance by filtering what is downloaded
	await tab.setRequestInterception(true);
	tab.on('request', req => {
		blockedResourceTypes.includes(req.resourceType()) ?
			req.abort() :
			req.continue();
		console.lo
	});

	// Go to Allocine website, city-list page
	await tab.goto('http://www.allocine.fr/salle/');
	const cities = await tab.evaluate(sel => {
		const elements = Array.from(document.querySelectorAll(sel));
		return elements.map(tag => tag.text);
	}, '#region_120003 a');

	// Show all the cities
	honey('Those are all the cities available');
	for (let i = 0; i < cities.length; i++) {
		sugar(`${i + 1} -> ${cities[i]}\t\t`);
		if ((i + 1) % 3 == 0)
			honey();
	}
	honey();

	// Ask user for a city to visit
	let choice = rls.question('Your choice : ') - 1;
	const city = cities[choice];
	const query = `Pathé+${encodeURI(city)}`;

	// Fetch all the cinemas of the chosen city
	await tab.goto(`http://www.allocine.fr/salle/recherche/?q=${query}`);
	const cinemas = await tab.evaluate(sel => {
		const elements = Array.from(document.querySelectorAll(sel));
		return elements.map(tag => [tag.text, tag.href]);
	}, 'div.colcontent > div:nth-child(2) > a');

	// Ask user for a cinema
	if (cinemas.length == 0) {
		honey('There is no cinema Pathé in this city');
		await browser.close();
		process.exit();
	}

	honey(`Those are all the cinemas available in ${city}`);
	for (let i = 0; i < cinemas.length; i++) {
		honey(`${i + 1} -> ${cinemas[i][0]}`);
	}
	honey();
	choice = rls.question('Your choice : ') - 1;
	honey();
	const cinema = cinemas[choice];

	// Get all available movies in the chosen cinema
	blockedResourceTypes = blockedResourceTypes.filter(type => !['image', 'script'].includes(type));
	await tab.goto(cinema[1])
	const movies = await tab.evaluate(sel => {
		let elements = Array.from(document.querySelectorAll(sel));
		return elements.map(element => {
			return {
				id: element.id,
				title: element
					.querySelector('.meta-title-link')
					.textContent
			}
		})
	}, '.hred[id^=movie]');

	if (movies.length == 0) {
		honey('There is no movie playing in this cinema');
		await Browser.close();
		process.exit();
	}

	honey('Here are the movies playing in this cinema');
	for (let i = 0; i < movies.length; i++) {
		honey(`${i + 1} -> ${movies[i].title}`);
	}

	honey();
	choice = rls.question('Your choice : ') - 1;
	honey();
	const movie = movies[choice];

	// Get all the available shows
	let planning = await tab.evaluate((movie) => {
		const panels = Array.from(document.querySelectorAll('.roller-item'));
		return panels.map(el => {
			el.click();
			const dateNodes = Array.from(el.querySelectorAll('.day, .num, .month'));
			const hoursNodes = Array.from(document.querySelectorAll(`#${movie.id}.hred:not(.hide) a.hours-item.bookable`));
			const dayPlanning = hoursNodes.map(node => {
				return {
					"hour": node
						.querySelector('.hours-item-value')
						.innerText,
					"link": node.getAttribute('href')
				}
			});
			return {
				"date": dateNodes.map(a => a.textContent),
				"shows": dayPlanning
			}
		});
	}, movie);

	planning = planning
		.filter(day => day.shows.length > 0)
		.map(day => {
			return {
				"date": day
					.date
					.map(datePart => normalize(datePart))
					.join(' '),
				"shows": day.shows
			}
		});

	// Ask user for a day
	if (planning.length == 0) {
		honey("Unfortunately, there's no more available show for this movie");
		await browser.close();
		process.exit();
	}

	honey("Here's the list of all the days you can book");
	for (let i = 0; i < planning.length; i++) {
		let day = planning[i];
		honey(`${i + 1} -> ${day.date}`);
	}

	honey();
	choice = rls.question('Your choice : ') - 1;
	const day = planning[choice];
	honey();

	// Ask user for a show to book
	honey(`Here's the list of all the shows on ${day.date}`);
	for (let i = 0; i < day.shows.length; i++) {
		honey(`${i + 1} -> ${day.shows[i].hour}`);
	}

	honey();
	choice = rls.question('Your choice : ') - 1;
	const show = day
		.shows[choice]
		.link;
	honey();

	// Go to Gaumont Pathe Booking system
	// Idle2 required here as the page has kind of a lazy load stuff
	await tab.goto(show, {
		waitUntil: 'networkidle2'
	});

	// Check if we can simply go free placing or if we should pick one or more places
	const freePlacing = await tab.evaluate(() => {
		return document
			.querySelectorAll('#plan')
			.length === 0;
	});

	// Pick two places
	if (!freePlacing) {
		honey('You have to pick two places');
		await tab.click('body > cgp-front-app > booking-component > booking-seating-component > div.plansalle.container.ng-tns-c0-0.ng-trigger.ng-trigger-accordion > booking-seating-title-component > div > div > span.ignore.col-xs-12.col-sm-3 > button')
			.catch(async () => {
				honey(`Sorry, this time Gaumont Pathe won't allow skipping this part`);
				const url = await tab.evaluate(() => {
					return window.location.href;
				});
				honey(`Here's the link to visit : ${url}`);
				await browser.close();
				process.exit();
			});
		honey(`I'll handle it, don't worry`);
	}

	await tab.click('booking-pricing-cards-slider-component > aside > div > div > div > div:nth-child(3) > a')
		.catch(async () => {
			honey(`Something bad happened, sorry. I'll improve`);
			await browser.close();
			process.exit();
		})
	await tab.type('#text', 'XXXXXXXXXXXX');
	await tab.type('#familyName', 'XXXXXXXX');
	await tab.click('section > section.center-block.col-sm-12 > section:nth-child(4) > form > button');

	await tab.click('.addmore');
	const cost = await tab.evaluate(sel => {
		return document.querySelector(sel)
			.innerText.slice(0, -1);
	}, '.totalGeneral');
	choice = rls.question(`It will cost : ${cost}, is it okay ?\n(Y/n) : `)
		.toUpperCase();

	if (choice === 'Y') {
		await tab.click('booking-pricing-validation-component > section > section > button')
			.catch(async (err) => {
				honey(err);
				const url = await tab.evaluate(() => {
					return window.location.href;
				});
				honey(`There's a captcha or an error from the booking website. Sorry, you should handle it by yourself now.\nHere's the link to visit : ${url} `);
				await browser.close();
				process.exit();
			});

		choice = rls.question(`Alright ! To which email address should I send your ticket ?`);
		await tab.evaluate(() => {
			document.querySelector('input#email')
				.value = '';
		});
		await tab.type('#email', choice);
		await tab.click('#nologged > div > div.topspaccing > div.nologed-btn.col-sm-4 > button > span');
		honey('There you go! Have a nice day, enjoy the show and grab some popcorns :D');
	} else {
		honey(`It's been a pleasure :D Bye! cya`);
	}

	await browser.close();
})();
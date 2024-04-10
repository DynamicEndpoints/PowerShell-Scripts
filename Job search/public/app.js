const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const port = 3000;

app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static('public'));

const scrapeJobListing = async (url) => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const title = $('h1').text();
  const location = $('.recJobLoc').text();
  const company = $('.company').text();
  const summary = $('.summary').text();
  return { title, location, company, summary, url };
};

const scrapeGoogleResults = async (results) => {
  const scrapedResults = [];
  for (const result of results) {
    if (result.link.includes('site:linkedin.com') || result.link.includes('site:indeed.com')) {
      const url = `https://www.google.com${result.link.replace('site:linkedin.com', '').replace('site:indeed.com', '')}`;
      const scrapedResult = await scrapeJobListing(url);
      scrapedResults.push(scrapedResult);
    }
  }
  return scrapedResults;
};

const scrapeLinkedInResults = async (results) => {
  const scrapedResults = [];
  for (const result of results) {
    const link = result.link.replace('keywords=', '').replace('location=');
    const url = `https://www.linkedin.com/${link}`;
    const scrapedResult = await scrapeJobListing(url);
    scrapedResults.push(scrapedResult);
  }
  return scrapedResults;
};

app.get('/search/:position', async (req, res) => {
  const position = req.params.position;
  const urls = [
    `https://www.google.com/search?q=${encodeURIComponent(position)}&num=10`,
    `https://www.indeed.com/jobs?q=${encodeURIComponent(position)}&l=`,
    `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(position)}`
  ];
  const results = [];

  try {
    for (const url of urls) {
      console.log(`Fetching ${url}`);
      const response = await axios.get(url);
      console.log(`Status: ${response.status}, Status Text: ${response.statusText}`);
      const html = response.data;
      const $ = cheerio.load(html);
      const items = $('.jobsearch-SerpJobCard, .g, .job-search-card');
      console.log(`Number of items: ${items.length}`);

      for (const item of items) {
        if ($(item).hasClass('jobsearch-SerpJobCard')) {
          const engine = 'Indeed';
          const title = $(item).find('.title > a').text();
          const link = `https://www.indeed.com${$(item).find('.title > a').attr('href')}`;
          const location = $(item).find('.recJobLoc').text();
          results.push({ engine, title, link, location });
        } else if ($(item).hasClass('g')) {
          const engine = 'Google';
          const title = $(item).find('.tF2Cxc').text();
          const link = `https://www.google.com${$(item).find('.tF2Cxc').attr('href')}`;
          const location = $(item).find('.yuRUbf > a').text();
          results.push({ engine, title, link, location });
        } else if ($(item).hasClass('job-search-card')) {
          const engine = 'LinkedIn';
          const title = $(item).find('.title > a').text();
          const link = $(item).find('.title > a').attr('href');
          results.push({ engine, title, link, location: $(item).find('.job-search-card__location').text() });
        }

        if (results.length >= 15) {
          break;
        }
      }
    }

    console.log(`Number of results: ${results.length}`);
    console.log(results);

    const googleResults = await scrapeGoogleResults(results.filter(result => result.engine === 'Google'));
    const indeedResults = await scrapeIndeedResults(results.filter(result => result.engine === 'Indeed'));
    const linkedInResults = await scrapeLinkedInResults(results.filter(result => result.engine === 'LinkedIn'));

    const allResults = [...googleResults, ...indeedResults, ...linkedInResults];

    res.json({ results: allResults });
  } catch (error) {
    console.error(error.message);
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Job search app listening at http://localhost:${port}`);
});
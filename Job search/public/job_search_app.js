const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const app = express();

app.use(express.json());

// Serve the "index.html" file at the root URL
app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

// Serve static files from the "public" directory
app.use(express.static('public'));

app.get('/search/:position', (req, res) => {
  const position = req.params.position;
  console.log('Position from URL path:', position);
  searchJobs(req, res, position);
});

async function searchJobs(req, res, position) {
  console.log(`Searching for position: ${position}`);
  const filter = req.query.filter;
  const sortBy = req.query.sortBy;

  const searchEngines = ['google', 'indeed', 'linkedin'];
  const searchResults = [];
  let browser;

  try {
    console.log(`Using filter: ${filter}`);
    console.log(`Using sortBy: ${sortBy}`);

    if (!position) {
      return res.status(400).json({ error: 'Position is required' });
    }

    const browserOptions = {
      wsEndpoint: process.env.BROWSERLESS_PUPPETEER_WS_ENDPOINT,
    };
    browser = await puppeteer.launch(browserOptions);

    for (const engine of searchEngines) {
      console.log(`Searching engine: ${engine}`);

      const client = await browser.newPage();
      let url = '';

      switch (engine) {
        case 'google':
          url = `https://www.google.com/search?q=site:linkedin.com%2Fjobs%20OR%20site:indeed.com%2Fjobs%20${encodeURIComponent(
            position
          )}`;
          console.log(`Google URL: ${url}`);
          break;
        case 'indeed':
          url = `https://www.indeed.com/jobs?q=${encodeURIComponent(position)}&l=`;
          console.log(`Indeed URL: ${url}`);
          break;
        case 'linkedin':
          url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
            position
          )}&location=Worldwide`;
          console.log(`LinkedIn URL: ${url}`);
          break;
      }

      try {
        await client.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000,
        });
      } catch (gotoError) {
        console.error(`Failed to navigate to ${url}: ${gotoError.message}`);
        await client.close();
        continue;
      }

      switch (engine) {
        case 'google': {
          const html = await client.content();
          const $ = cheerio.load(html);
          const results = $('div.g div.rc > div.r > a');

          for (let i = 0; i < results.length && i < 5; i++) {
            const link = results.eq(i).attr('href');
            const text = results.eq(i).text();

            if (link && text) {
              searchResults.push({
                engine,
                link,
                title: text,
              });
            }
          }
          break;
        }
        case 'indeed': {
          const html = await client.content();
          const $ = cheerio.load(html);
          const results = $('div.jobsearch-SerpJobCard');

          for (const result of results) {
            const titleElement = $(result).find('.title > a');
            const locationElement = $(result).find('.recJobLoc');
            const salaryElement = $(result).find('.salaryText');

            if (titleElement.length) {
              const title = titleElement.text().trim();
              const link = titleElement.attr('href');

              searchResults.push({
                engine,
                link,
                title,
                location: locationElement.text().trim(),
                salary: salaryElement.text().trim(),
              });
            }

            if (searchResults.length >= 15) {
              break;
            }
          }
          break;
        }
        case 'linkedin': {
          const html = await client.content();
          const $ = cheerio.load(html);
          const results = $('li.job-search-card');

          for (const result of results) {
            const titleElement = $(result).find('.title > a');
            const locationElement = $(result).find('.job-search-card__location');

            if (titleElement.length) {
              const title = titleElement.text().trim();
              const link = titleElement.attr('href');

              searchResults.push({
                engine,
                link,
                title,
                location: locationElement.text().trim(),
              });
            }

            if (searchResults.length >= 15) {
              break;
            }
          }
          break;
        }
      }

      await client.close();
    }

    // Filter and sort the results
    let filteredResults = searchResults.filter((result) => {
      if (!filter) return true;
      return result.engine === filter;
    });

    filteredResults.sort((a, b) => {
      if (sortBy === 'engine') {
        return a.engine.localeCompare(b.engine);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    res.json({ results: filteredResults });
  } catch (error) {
    if (!res.headersSent) {
      console.error(error.message);
      res.status(500).send(error.message);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

app.listen(3001, () => console.log('Listening on PORT: 3001'));
```js
const axios = require('axios');
const cheerio = require('cheerio');

async function fetchOER(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Example logic to extract data
    const title = $('head > title').text();
    const content = $('#content').text();

    return { title, content };
  } catch (error) {
    console.error('Error fetching OER:', error);
    throw error;
  }
}

module.exports = { fetchOER };
```
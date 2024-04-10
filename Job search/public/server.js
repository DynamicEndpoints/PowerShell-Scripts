const express = require('express');
const path = require('path');
const app = express();
const port = 8080;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/search/:position', (req, res) => {
  require('./job_search_app')(req, res);
});

app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');


//const { authenticate } = require("./src/middleware/auth");

const app = express();

app.use(cors());

app.use(bodyParser.json({
    limit: '1000mb'
}));

app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 1000000
}));

app.use(require('./src/routes/pdfs'));
app.use(require('./src/routes/historia'));
app.use(require('./src/routes/reportes'));
app.use(require('./src/routes/sited'));

module.exports = { app };

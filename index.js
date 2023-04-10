
const { app } = require("./app");
const { express } = require("./config");
const { conectarMongoDB } = require('./src/db/mongo/index')
// const { conectarWSP } = require('./src/helpers/wsp');
const { conectarSqlServer } = require('./src/db/sql');



conectarMongoDB();
// conectarWSP();
conectarSqlServer();


app.listen(express.PORT_EXPRESS);

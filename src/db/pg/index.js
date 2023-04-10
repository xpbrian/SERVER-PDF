const { Pool } = require('pg');
const { pg } = require('../../../config')

const poolPg = new Pool({
    host: pg.HOST_PG,
    user: pg.USER_PG,
    password: pg.PASSWORD_PG,
    database: pg.DATABASE_PG,
    port: pg.PORT_PG
});
module.exports = { poolPg }
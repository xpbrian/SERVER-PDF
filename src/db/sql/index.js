const sql = require('mssql')
const sqlConfig = {
    user: 'usersql',
    password: 'us3r.5ql',
    database: 'BDSistComp',
    server: '132.157.150.235',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false, // for azure
        trustServerCertificate: false // change to true for local dev / self-signed certs
    }
}

const conectarSqlServer = async () => {
    try {
        await sql.connect(sqlConfig)
    } catch (err) {
        console.log(err);
    }
}
module.exports = {
    conectarSqlServer, sql
}
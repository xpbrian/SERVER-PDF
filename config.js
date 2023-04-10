const { config } = require("dotenv");
config();

module.exports = {
    express: {
        PORT_EXPRESS: process.env.PORT_EXPRESS || '4001'
    },
    mongo: {
        MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/prueba",
    },
    pg: {
        HOST_PG: process.env.HOST_PG || '5.9.118.78',
        USER_PG: process.env.USER_PG || 'postgres',
        PASSWORD_PG: process.env.PASSWORD_PG || 'geoserver',
        DATABASE_PG: process.env.DATABASE_PG || 'postgres',
        PORT_PG: process.env.PORT_PG || '5432',
    },
    mysql: {

        servidores: [
            {
                PORT_MYSQL: process.env.PORT_MYSQL || '3307',
                nombre: 'servidor_alepho',
                HOST_MYSQL: process.env.HOST_MYSQL || 'localhost',
                // USER_MYSQL: process.env.USER_MYSQL || 'root',
                // PASSWORD_MYSQL: process.env.PASSWORD_MYSQL || 'v3$alio',
                USER_MYSQL: process.env.USER_MYSQL || 'db_vesalio',
                PASSWORD_MYSQL: process.env.PASSWORD_MYSQL || 'v3s4L1o',
            },
            {
                PORT_MYSQL: process.env.PORT_MYSQL || '3306',
                nombre: 'servidor_copia',
                HOST_MYSQL: process.env.HOST_MYSQL || 'localhost',
                USER_MYSQL: process.env.USER_MYSQL || 'root',
                PASSWORD_MYSQL: process.env.PASSWORD_MYSQL || 'v3$alio',

            },
        ]
    },
    sql: {
        USER_SQL: process.env.USER_SQL || 'usersql',
        PASSWORD_SQL: process.env.PASSWORD_SQL || 'us3r.5ql',
        DATABASE_SQL: process.env.DATABASE_SQL || 'BDSistComp',
        SERVER_SQL: process.env.SERVER_SQL || '132.157.150.235',
    }
}



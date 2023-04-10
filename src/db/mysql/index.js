const { createPool } = require('mysql2/promise')
const { mysql } = require('../../../config')

var conexion = [];

for (var i = 0; i < mysql.servidores.length; i++) {
  const poolMysql = createPool({
    host: mysql.servidores[i].HOST_MYSQL,
    user: mysql.servidores[i].USER_MYSQL,
    password: mysql.servidores[i].PASSWORD_MYSQL,
    port: mysql.servidores[i].PORT_MYSQL,
  });
  conexion.push({ nombre: mysql.servidores[i].nombre, connect: poolMysql })
}


module.exports = conexion;
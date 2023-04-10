
const conexion = require('../db/mysql')
const { sql } = require('../db/sql');

const getListaAtenciones = async (req, res) => {
    try {

        var documento = req.params.id

        const result = await sql.query(`exec BDSistComp.dbo.usp_vesalio_ex_atenciones_xdni @dni='${documento}'`)
        console.log(result);
        res.status(200).json(result)
    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}

const getListaAtencionesSited = async (req, res) => {
    try {

        var { Nro_AutoSiteds,CodigoIafaSited,CodigoAfiliadoSited } = req.body

        console.log(req.body);
        const result = await sql.query(`exec siteds.dbo.Usp_SITED_SSTC_DATOSGENERALES_Select @OpcionSql='S', @CO_IAFASCODE ='${CodigoIafaSited}', @CO_ASEGCODE  ='${CodigoAfiliadoSited}', @CO_AUTOCODE ='${Nro_AutoSiteds}'`)
        res.status(200).json({
            datosGenerales: result.recordset
        })
    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el Sited.' })
    }
}
const getsqlModeGroupby = async (req, res) => {
    try {

        // var consulta = `SELECT @@sql_mode;`
        // var consulta = `SET GLOBAL  sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`
         var consulta = `SET SESSION sql_mode = sys.list_add(@@session.sql_mode, '')`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta); 
        res.status(200).json(rows)
    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el Sited.' })
    }
}
module.exports = {

    getListaAtenciones,
    getListaAtencionesSited,
    getsqlModeGroupby

}
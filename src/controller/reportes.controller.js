const Usuario = require('../models/Usuarios')
const conexion = require('../db/mysql')
const Cita = require('../models/Citas');

const getReporteDesertadosGenerados = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.body;
        var consulta = `SELECT
                            *,
                            COUNT(*) cantidad
                        FROM (
                        SELECT 
                            e.nombre,
                            e.id especialidadId,
                            CASE 
                                    when tp.consulta_id IS NULL then 'Desertadas'
                                ELSE 'Generadas'	   
                            END valor
                            
                        FROM vesalio.turno_programado tp
                        INNER JOIN vesalio.persona p ON p.id=tp.persona_id
                        INNER JOIN vesalio.agenda a ON a.id = tp.agenda_id
                        INNER JOIN vesalio.asignacion s ON s.id=a.asignacion_id 
                        INNER JOIN vesalio.especialidad e ON e.id = s.especialidad_id
                        WHERE 
                                tp.fecha >= '${fechaInicio}'  AND 
                                tp.fecha <= '${fechaFin}'  AND  
                                tp.estado_turno_id  IN (6,2,4,1,5,9) and 
                                a.a_demanda = 0 
                        ) datos 
                        GROUP BY nombre,valor				
       `
        const [rows] = await conexion.find(x => x.nombre === 'servidor_alepho').connect.query(consulta);
        res.status(200).json({
            total: rows
        })
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getReporteDesertadosTotal = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.body;
        var consulta = `SELECT 
                            e.nombre,
                            e.id especialidadId,
                            tp.estado_turno_id,
                            CONCAT(p.apellidos, ' ', p.nombres) paciente,
                            p.documento,
                            et.nombre estado_turno,
                            if(tp.consulta_id IS NULL, '',tp.consulta_id) consulta_id,
                            CONCAT(p2.apellidos, ' ', p2.nombres) doctor,
                            fecha,
                            hora
                        FROM vesalio.turno_programado tp
                        INNER JOIN vesalio.persona p ON p.id=tp.persona_id
                        INNER JOIN vesalio.agenda a ON a.id = tp.agenda_id
                        INNER JOIN vesalio.estado_turno et ON et.id = tp.estado_turno_id
                        INNER JOIN vesalio.asignacion s ON s.id=a.asignacion_id 
                        INNER JOIN vesalio.especialidad e ON e.id = s.especialidad_id
                        INNER JOIN vesalio.personal pl ON s.personal_id = pl.id
                        INNER JOIN vesalio.persona p2 ON p2.id = pl.persona_id
                        WHERE 
                                tp.fecha >= '${fechaInicio}'  AND 
                                tp.fecha <= '${fechaFin}'  AND  
                                tp.estado_turno_id IN (6,2,4,1,5,9) and 
                                a.a_demanda = 0 
                        ORDER BY fecha,hora,CONCAT(p2.apellidos, ' ', p2.nombres) 				
       `
        const [rows] = await conexion.find(x => x.nombre === 'servidor_alepho').connect.query(consulta);
        res.status(200).json({
            total: rows
        })
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const primerReporte = async (req, res) => {
    try {
        const { fecha, fechaFin, filtro } = req.body;
        let where = ''
        if (filtro.length !== 0) {
            if (filtro === 'anulada') {
                where += ' and tp.estado_turno_id in(3)'
            } else {
                where += ' and tp.estado_turno_id not in(3,7)'
            }
        } else {
            where += ' and tp.estado_turno_id not in(7)'
        }
        var consulta = ` SELECT 
                            tp.id,
                            case 
                                when tp.created_by = 2703 then 1
                                when tp.created_by != 2703 then 2
                            END tipo
                        from vesalio.turno_programado tp 
                        INNER JOIN vesalio.agenda a ON tp.agenda_id=a.id
                        -- INNER JOIN vesalio.asignacion ag ON ag.id = a.asignacion_id
                        -- INNER JOIN vesalio.especialidad ep ON ep.id=ag.especialidad_id
                        -- INNER JOIN vesalio.personal pr ON pr.id = ag.personal_id
                        -- INNER JOIN vesalio.persona p ON p.id = pr.persona_id
                        -- INNER JOIN vesalio.estado_turno et ON et.id=tp.estado_turno_id
                        -- INNER JOIN vesalio.plan pl ON pl.id = tp.plan_id
                        -- INNER JOIN vesalio.persona pr1 ON pr1.id = tp.persona_id 
                        WHERE (substr(tp.created_at,1,10) >= '${fecha}') and 
                              (substr(tp.created_at,1,10) <= '${fechaFin}' ) and
                               a.a_demanda = 0  ${where}`

        const [rows] = await conexion.find(x => x.nombre === 'servidor_alepho').connect.query(consulta);

        var tmp = []
        for await (var num of rows.filter(x => parseInt(x.tipo) === 1)) {
            let existeId = await Cita.find({ turno_programado_id: num.id })
            if (existeId.length > 0) {
                let ausuario = await Usuario.findById(existeId[0].paciente)
                if (ausuario !== null) {
                    tmp.push({ ...ausuario.cuenta.tipo_usuario })
                }
            }
        }
        var final = tmp.reduce((arr, item) => {
            let exist = arr.findIndex(x => x.id === item.descripcion)
            if (exist < 0) {
                arr.push({ id: item.descripcion, cantidad: 1 })
            } else {
                arr[exist].cantidad += 1
            }
            return arr
        }, [])

        res.status(200).json([...final, {
            id: "ALEPHOO ",
            cantidad: rows.filter(x => parseInt(x.tipo) === 2).length
        }])

    } catch (err) {
        console.log(err);
        res.status(200).json({
            rpta: 0,
            msj: 'Ocurrio un error'
        })
    }
}
const primerReporteDetalle = async (req, res) => {
    try {
        const { fecha, fechaFin } = req.body;
        /*var consulta = ` SELECT 
                            tp.id,
                            case 
                                when tp.created_by = 2703 then 1
                                when tp.created_by != 2703 then 2
                            END tipo,
                            estado_turno_id
                        from vesalio.turno_programado tp 
                        INNER JOIN vesalio.agenda a ON tp.agenda_id=a.id
                        INNER JOIN vesalio.asignacion ag ON ag.id = a.asignacion_id
                        INNER JOIN vesalio.especialidad ep ON ep.id=ag.especialidad_id
                        INNER JOIN vesalio.personal pr ON pr.id = ag.personal_id
                        INNER JOIN vesalio.persona p ON p.id = pr.persona_id
                        INNER JOIN vesalio.estado_turno et ON et.id=tp.estado_turno_id
                        INNER JOIN vesalio.plan pl ON pl.id = tp.plan_id
                        INNER JOIN vesalio.persona pr1 ON pr1.id = tp.persona_id 
                        WHERE (substr(tp.created_at,1,10) >= '${fecha}') and 
                        (substr(tp.created_at,1,10) <= '${fechaFin}') and
                        a.a_demanda = 0 and tp.estado_turno_id not in(7)`

        */
        var consulta = `SELECT 
                            tp.id,
                            CASE 
                                when tp.created_by = 2703 then 1
                                when tp.created_by != 2703 then 2
                            END tipo,
                            estado_turno_id estado,
                            p.documento,
                            CONCAT(apellidos,' ',nombres) apellidos
                        FROM vesalio.turno_programado tp 
                        INNER JOIN vesalio.agenda a ON tp.agenda_id=a.id
                        INNER JOIN vesalio.usuario u ON u.id=tp.created_by
                        INNER JOIN vesalio.personal pl ON pl.id=u.personal_id
                        INNER JOIN vesalio.persona p ON p.id=pl.persona_id
                        WHERE (substr(tp.created_at,1,10) >= '${fecha}') and 
                              (substr(tp.created_at,1,10) <= '${fechaFin}') and
                              a.a_demanda = 0 and 
                              tp.estado_turno_id not in(7)`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_alepho').connect.query(consulta);
        var array = rows.filter(x => parseInt(x.tipo) === 2).reduce((arr, item) => {
            let exist = arr.findIndex(x => x.documento === item.documento)
            if (exist < 0) {
                arr.push({ documento: item.documento, id: item.apellidos, cantidad: 1, anulado: item.estado === 3 ? 1 : 0, generado: item.estado !== 3 ? 1 : 0 })
            } else {
                arr[exist].cantidad += 1
                if (item.estado === 3) {
                    arr[exist].anulado += 1
                }
                if (item.estado !== 3) {
                    arr[exist].generado += 1
                }
            }
            return arr
        }, [])
        var tmp = [...array, { documento: '99887766223311', id: 'PACIENTE', cantidad: 0, anulado: 0, generado: 0, tipo: 'PACIENTE' }]

        for await (var num of tmp) {
            let ausuario = await Usuario.find({ "datos.numero_documento": num.documento })
            let exist = tmp.findIndex(x => x.documento === num.documento)
            if (ausuario.length> 0) {
                tmp[exist].tipo = ausuario[0].cuenta.tipo_usuario.descripcion
            }
            
        }

        for await (var num of rows.filter(x => parseInt(x.tipo) === 1)) {
            let existeId = await Cita.find({ turno_programado_id: num.id })
            if (existeId.length > 0) {
                let ausuario = await Usuario.findById(existeId[0].paciente)
                if (ausuario !== null) {
                    if (ausuario.cuenta.tipo_usuario.id === '01') {
                        let findExite = tmp.findIndex(x => x.id === 'PACIENTE')
                        if (findExite > 0) {
                            tmp[findExite].cantidad += 1
                            if (num.estado === 3) {
                                tmp[findExite].anulado += 1
                            }
                            if (num.estado !== 3) {
                                tmp[findExite].generado += 1
                            }

                        }

                    } else {

                        let mensaje = ausuario.datos.ape_paterno + ' ' + ausuario.datos.ape_materno + ' ' + ausuario.datos.nombres
                        let documento = ausuario.datos.numero_documento

                        let findExite = tmp.findIndex(x => x.documento === documento)
                        if (findExite > 0) {
                            tmp[findExite].cantidad += 1
                            tmp[findExite].tipo = ausuario.cuenta.tipo_usuario.descripcion
                            if (num.estado === 3) {
                                tmp[findExite].anulado += 1
                            }
                            if (num.estado !== 3) {
                                tmp[findExite].generado += 1
                            }
                        } else {
                            tmp.push({ documento: documento, id: mensaje, cantidad: 1, anulado: num.estado === 3 ? 1 : 0, generado: num.estado !== 3 ? 1 : 0, tipo: ausuario.cuenta.tipo_usuario.descripcion })
                        }
                    }
                }
            }
        }

        res.status(200).json(tmp)

    } catch (err) {
        console.log(err);
        res.status(200).json({
            rpta: 0,
            msj: 'Ocurrio un error'
        })
    }
}
const primerReporteAplehoo = async (req, res) => {
    try {
        const { fecha, fechaFin } = req.body;

        var consulta = `SELECT 
                            tp.id,
                            DATE_FORMAT(tp.fecha, "%e/%c/%Y") fecha,
                            tp.hora,
                            ep.nombre,
                            et.nombre estado,
                            p.documento,
                            CONCAT(p.apellidos,' ',p.nombres) apellidosCreador,
                            CONCAT(p2.apellidos,' ',p2.nombres) apellidosDoctor,
                            CONCAT(p3.apellidos,' ',p3.nombres) apellidosPaciente,
                            case 
                                when tp.created_by = 2703 then 1
                                when tp.created_by != 2703 then 2
                            END tipo
                        FROM vesalio.turno_programado tp 
                        INNER JOIN vesalio.agenda a ON tp.agenda_id=a.id
                        INNER JOIN vesalio.asignacion ag ON ag.id = a.asignacion_id
                        INNER JOIN vesalio.especialidad ep ON ep.id=ag.especialidad_id
                        inner join vesalio.estado_turno et on tp.estado_turno_id = et.id
                        INNER JOIN vesalio.personal pl2 ON ag.personal_id = pl2.id
                        INNER JOIN vesalio.persona p2 ON p2.id = pl2.persona_id
                        INNER JOIN vesalio.persona p3 ON p3.id = tp.persona_id
                        INNER JOIN vesalio.usuario u ON u.id=tp.created_by
                        INNER JOIN vesalio.personal pl ON pl.id=u.personal_id
                        INNER JOIN vesalio.persona p ON p.id=pl.persona_id
                        WHERE (substr(tp.created_at,1,10) >= '${fecha}') and 
                              (substr(tp.created_at,1,10) <= '${fechaFin}') and
                              a.a_demanda = 0 and 
                              tp.estado_turno_id not in(7) and 
                              tp.created_by != 2703
                              `
        const [rows] = await conexion.find(x => x.nombre === 'servidor_alepho').connect.query(consulta);

        res.status(200).json(rows)

    } catch (err) {
        console.log(err);
        res.status(200).json({
            rpta: 0,
            msj: 'Ocurrio un error'
        })
    }
}
const reporteGeneral = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.body;

        var consulta = `SELECT 
                            e.id especialidad_id,
                            e.nombre,
                            fecha,
                            et.id estado_turno_id,
                            et.nombre estado,
                            tp.id
                        FROM vesalio.turno_programado tp
                        INNER JOIN vesalio.persona p ON p.id=tp.persona_id
                        INNER JOIN vesalio.agenda a ON a.id = tp.agenda_id
                        INNER JOIN vesalio.asignacion s ON s.id=a.asignacion_id 
                        INNER JOIN vesalio.especialidad e ON e.id = s.especialidad_id
                        INNER JOIN vesalio.estado_turno et ON et.id = tp.estado_turno_id
                        WHERE tp.fecha >= '${fechaInicio}'  AND 
                            tp.fecha <= '${fechaFin}'  AND  
                            tp.estado_turno_id  NOT IN (7) AND 
                            tp.created_by = 2703`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_alepho').connect.query(consulta);
        var tmp = []
        for await (var num of rows) {
            let existeId = await Cita.find({ turno_programado_id: num.id })
            if (existeId.length > 0) {
                let ausuario = await Usuario.findById(existeId[0].paciente)
                if (ausuario !== null) {
                    if (ausuario.cuenta.tipo_usuario.id === '01') {
                        tmp.push(num)
                    }
                }
            }
        }
        res.status(200).json(tmp)

    } catch (err) {
        res.status(200).json({
            rpta: 0,
            msj: 'Ocurrio un error'
        })
    }
}


module.exports = {
    getReporteDesertadosGenerados,
    getReporteDesertadosTotal,
    primerReporteDetalle,
    primerReporte,
    primerReporteAplehoo,
    reporteGeneral
}
const conexion = require('../db/mysql')
const { sql } = require('../db/sql');
const Usuarios = require('../models/Usuarios');


const accessoSistemaMedico = async (req, res) => {

    try {
        const { datos } = req.body;
        var existe = await Usuarios.find({
            "cuenta.usuario": datos.find(x => x.id === 'cuenta').value,
        })
        if (existe.length === 0) {
            res.status(200).json({
                rpta: 0,
                msj: 'Error al iniciar session, el usuario ingresado no existe'
            })
        } else {
            if (existe.filter(x => x.cuenta.password === datos.find(x => x.id === 'contrasena').value).length === 0) {
                res.status(200).json({
                    rpta: 0,
                    msj: 'Error al iniciar session, contraseña erronea'
                })
            } else {
                let ruta = ''
                if (existe[0].cuenta.tipo_usuario.id === '03' || existe[0].cuenta.tipo_usuario.id === '09') {
                    res.status(200).json({
                        rpta: 1,
                        msj: 'Accesso correcto',
                        datos: existe.filter(x => x.cuenta.password === datos.find(x => x.id === 'contrasena').value)[0]._id.toString(),
                        ruta: ruta
                    })
                } else {
                    res.status(200).json({
                        rpta: 0,
                        msj: 'El usuario que ingreso no tiene permisos de medico'
                    })
                }

            }
        }

    } catch (e) {
        res.status(200).json({
            rpta: 0,
            msj: 'Error al iniciar session'
        })
    }
}


const cambiarUsuario = async (req, res) => {

    try {
        const { id, usuario } = req.body;
        var existe = await Usuarios.findById(id)
        if (existe.cuenta.tipo_usuario.id === '03' || existe.cuenta.tipo_usuario.id === '09') {
            await Usuarios.findByIdAndUpdate(id, {
                $set: {
                    'cuenta.usuario': usuario
                }
            })
            res.status(200).json({
                rpta: 1,
                msj: 'Correcto',
                color: 'success'
            })
        } else {
            res.status(200).json({
                rpta: 0,
                msj: 'Solo puedes cambiar el usuario a los medicos',
                color: 'error'
            })
        }


    } catch (e) {
        res.status(200).json({
            rpta: 0,
            msj: 'Error al iniciar session'
        })
    }
}


const updateDoctorTratante = async (req, res) => {
    try {
        const { doctor, personaId } = req.body;
        var consulta = `update vesalio.internacion_persona set personal_id = ${doctor} where id=${personaId}`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        // segunda parte

        res.status(200).json('correcto')
    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el triaje.' })
    }
}
const insertTriaje = async (req, res) => {
    try {
        const { documento, especialidad, persona } = req.body;
        var consulta = `insert into vesalio.turno_programado
                        (agenda_id,persona_id,estado_turno_id,orden,fecha,hora,sobreturno,created_at,created_by,updated_at,modified_by,tipovezqueconsulta,por_callcenter,confirmado_por_paciente,turno_portal_condicional) 
                        values(
                                (select 
                                    a.id
                                from vesalio.agenda a
                                inner join vesalio.asignacion s on a.asignacion_id = s.id 
                                where s.especialidad_id = ${especialidad} and activo  = 1 and 
                                      dia = (select dia_de_la_semana from vesalio.calendario where fecha_calendario =(SELECT DATE(NOW())))
                                limit 1),
                                (SELECT 
                                    id 
                                 FROM vesalio.persona p 
                                 WHERE p.documento = '${persona}'),
                                1,
                                1, 
                                (SELECT DATE(NOW())),
                                (SELECT DATE_FORMAT( NOW() ,  '%H:%i' )),
                                0,
                                (select now()),
                                (SELECT 
                                    u.id 
                                 FROM vesalio.usuario u
                                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                 WHERE documento ='${documento}'),
                                 (select now()),
                                (SELECT 
                                    u.id 
                                 FROM vesalio.usuario u
                                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                 WHERE documento ='${documento}'),
                                1,
                                0,
                                1,
                                0
                        )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        // segunda parte

        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el triaje.' })
    }
}
const getPersonaHistoria = async (req, res) => {
    try {
        var { paciente, tipo_paciente } = req.body
        let where = '';
        var tmp = []
        if (paciente.length !== 0) {
            if (tipo_paciente === 'documento_paciente') {

                where = `where Nro_DocIdenti = '${paciente}'`
            } else {
                where = `where (Des_ApePaterno + ' ' + Des_ApeMaterno + ' ' + Des_Nombres) like '${paciente}%'`
            }
            var result = await sql.query(`select * from BDSistComp.dbo.historias ${where}`);
            for await (var num of result.recordset) {
                if (num.Nro_DocIdenti.length === 0) {
                    tmp.push({ ...num, isAlephoo: false })
                } else {
                    var consulta = `SELECT
                                        *
                                    FROM vesalio.persona 
                                    WHERE documento = '${num.Nro_DocIdenti}'`

                    const [documentoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
                    tmp.push({ ...num, isAlephoo: documentoRows.length === 0 ? false : true })
                }
            }
        }

        res.status(200).json({
            datosUsuario: where.length === 0 ? [] : tmp
        })

    } catch (e) {
        console.log(e);
        res.status(400).json('error')
    }

}
const getPersonaHistoriaPDF = async (req, res) => {
    try {

        var numero = req.params.id
        var consulta = `select 
                            * 
                        from vesalio.eventohc 
                        where persona_id = (select id from vesalio.persona where documento ='${numero}') and 
                              tipocontenido_id in (1,14,20) order by fechahora desc`

        const [documentoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        res.status(200).json(documentoRows)

    } catch (e) {
        console.log(e);
        res.status(400).json('error')
    }

}
const getPersonaHistoriaPDFCabecera = async (req, res) => {
    try {

        var consulta = req.params.id
        var consulta = `select 
                            e.nombre,
                            concat(p.apellidos,' ',p.nombres) apellidos
                        from vesalio.turno_programado tp
                        inner join vesalio.agenda a on a.id=tp.agenda_id
                        inner join vesalio.asignacion s on a.asignacion_id = s.id
                        inner join vesalio.especialidad e on e.id = s.especialidad_id
                        inner join vesalio.personal pl on s.personal_id = pl.id
                        inner join vesalio.persona p on p.id = pl.persona_id
                        where tp.id = (select turno_id from vesalio.consulta where id = ${consulta})`

        const [documentoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        res.status(200).json(documentoRows)

    } catch (e) {
        console.log(e);
        res.status(400).json('error')
    }

}
const insertEstudiosEmergencia = async (req, res) => {
    try {
        const { estudioid, personaInternacion, informacion, documento } = req.body;

        var consultaConsultaDetalle = `insert into vesalio.consultadetalle
                                        (consulta_id,creado_en )
                                       values(
                                            (select 
                                                    c.id
                                                from vesalio.consulta c
                                                inner join vesalio.eventohc h on h.datos = c.id
                                                where h.id = (select evento_id from vesalio.internacion_persona ip where id = ${personaInternacion} order by ip.id desc limit 1 )),
                                            (SELECT now())
       )`
        let rowsConsultaDetalle = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaConsultaDetalle);
        let consultaIdDetalleId = rowsConsultaDetalle[0].insertId

        var consulta = `insert into vesalio.informedeestudio
        (id,estudio_id,informacion,anormal,activo,evento_id,informe_pendiente,informe,informe_fecha,informadopor_id)
        values (
            ${consultaIdDetalleId},
            ${estudioid},
            '${informacion}',
            0,
            1,
            (select evento_id from vesalio.internacion_persona  where id = ${personaInternacion}),
            0,
            '',
            (select now()),
            (SELECT 
                u.id 
                FROM vesalio.usuario u
                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                WHERE documento ='${documento}')
        )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        // segunda parte

        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el estudio.' })
    }
}
const insertHojaEvolucion = async (req, res) => {
    try {
        const { personaInternacion, informacion, documento } = req.body;
        let [rowsExiste] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`select count(*) cantidad from vesalio.internacion_hoja_evolucion where persona_internacion_id = ${personaInternacion}`);
        let hojaEvolucionId = null
        if (rowsExiste[0].cantidad === 0) {
            var consultaEvolucion = `insert into vesalio.internacion_hoja_evolucion
            (persona_internacion_id)
           values(
                ${personaInternacion}
            )`
            let rowsEvolucion = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaEvolucion);
            hojaEvolucionId = rowsEvolucion[0].insertId
        } else {
            let [rowsEvolucionL] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`select id from vesalio.internacion_hoja_evolucion where persona_internacion_id = ${personaInternacion}`);
            hojaEvolucionId = rowsEvolucionL[0].id
        }



        var consulta = `insert into vesalio.evolucion_descripcion
        (hoja_evolucion_id,creado_por_id,descripcion,creado_en)
        values (
            ${hojaEvolucionId}, 
            (SELECT 
                u.id 
                FROM vesalio.usuario u
                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                WHERE documento ='${documento}'),
            '${informacion}',
            (select now())
        )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el hoja evolución.' })
    }
}
const insertHojaNotaIngreso = async (req, res) => {
    try {
        const { personaInternacion, informacion, documento } = req.body;
        let [rowsExiste] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`select count(*) cantidad from vesalio.internacion_hoja_nota_ingreso where persona_internacion_id = ${personaInternacion}`);
        if (rowsExiste[0].cantidad === 0) {
            var consultaEvolucion = `insert into vesalio.internacion_hoja_nota_ingreso
            (persona_internacion_id,descripcion,creado_por_id,creado_en)
           values(
                ${personaInternacion},
                '${informacion}',
                (SELECT 
                    u.id 
                    FROM vesalio.usuario u
                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                    WHERE documento ='${documento}'),
                    (select now())
            )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaEvolucion);
        }

        res.status(200).json('correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el hoja evolución.' })
    }
}
const insertAlta = async (req, res) => {
    try {
        const { personaInternacion, documento, procedimientos, ttoAlta, pronostico, recomendaciones, tipodieta, actividadfisica, descanso_medico_inicio, descanso_medico_fin } = req.body;
        /*
        var consultaControl = `insert into vesalio.internacion_emergencia_alta
                                (personal_id, 
                                    persona_internacion_id, 
                                    procedimientos, 
                                    ttoAlta, 
                                    pronostico, 
                                    recomendaciones, 
                                    tipodieta, 
                                    actividadfisica, 
                                    descanso_medico_inicio, 
                                    descanso_medico_fin)
        values(
                (SELECT 
                    u.id 
                FROM vesalio.usuario u
                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                WHERE documento ='${documento}'),
                ${personaInternacion},
                '${procedimientos}',
                '${ttoAlta}',
                '${pronostico}',
                '${recomendaciones}',
                '${tipodieta}',
                '${actividadfisica}',
                '${descanso_medico_inicio}',
                '${descanso_medico_fin}',
            )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaControl);

                    */

        var alat = `update vesalio.internacion_movimiento set tipo_evento_id =5 where persona_internacion_id = ${personaInternacion}`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(alat);

        var alat2 = `delete from vesalio.no_mostrar_internacion_emergencia where persona_internacion_id = ${personaInternacion}`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(alat2);

        res.status(200).json('correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el alta.' })
    }
}
const insertNotasEnfermeria = async (req, res) => {
    try {
        const { personaInternacion, informacion, documento } = req.body;

        var consulta = `insert into vesalio.internacion_hoja_enfermeria_notas
        (creado_por_id,persona_internacion_id,nota, fecha, creado_en)
        values (
            (SELECT 
                u.id 
                FROM vesalio.usuario u
                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                WHERE documento ='${documento}'),
            ${personaInternacion},
            '${informacion}',
            (select now()),
            (select now())
        )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el hoja evolución.' })
    }
}
const getEstudiosEmergencia = async (req, res) => {
    try {
        var personaInternacion = req.params.id
        var consulta = `select 
                            i.*,
                            concat(apellidos, ' ',nombres) informadoPor,
                            DATE_FORMAT(i.informe_fecha, "%e/%c/%Y %H:%i") fechahora,
                            et.nombre estudioNombre
                        FROM vesalio.informedeestudio i
                        INNER JOIN vesalio.consultadetalle cd on i.id= cd.id
                        inner join vesalio.consulta c on c.id = cd.consulta_id
                        inner join vesalio.eventohc h on h.datos = c.id
                        inner join vesalio.usuario u on i.informadopor_id = u.id
                        inner join vesalio.personal pl on pl.id = u.personal_id
                        inner join vesalio.persona p on p.id = pl.persona_id
                        inner join vesalio.estudio et on et.id = i.estudio_id
                        where h.id = (select evento_id from vesalio.internacion_persona where id = ${personaInternacion} order by cd.id desc limit 1 )
                        order by i.informe_fecha desc`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        console.log(consulta);
        res.status(200).json(rows)
    } catch (e) {
        console.log(e);
        res.status(400).json('error')
    }
}
const insertTriajeEmergencia = async (req, res) => {
    try {
        const { medicion, documento, persona, especialidad, comentario, criterio, turno, camaSelected } = req.body;
        var consultaMedicion = `insert into vesalio.medicion
        (persona_id, creadopor_id, modificadopor_id, tension_arterial_minima, tension_arterial_maxima,peso,talla,temperatura,creado_en, modificado_en, f_card,f_resp,sato,hgt) 
        values(
                (SELECT 
                    id 
                 FROM vesalio.persona p 
                 WHERE p.documento = '${persona}'),
                 (SELECT 
                    u.id 
                 FROM vesalio.usuario u
                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                 WHERE documento ='${documento}'),
                 (SELECT 
                    u.id 
                 FROM vesalio.usuario u
                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                 WHERE documento ='${documento}'),
                 ${parseFloat(medicion.tension_arterial_minima.length === 0 ? 0 : medicion.tension_arterial_minima)},
                 ${parseFloat(medicion.tension_arterial_maxima.length === 0 ? 0 : medicion.tension_arterial_maxima)},
                 ${parseFloat(medicion.peso.length === 0 ? 0 : medicion.peso)},
                 ${parseFloat(medicion.talla.length === 0 ? 0 : medicion.talla)},
                 ${parseFloat(medicion.temperatura.length === 0 ? 0 : medicion.temperatura)},  
                 (select now()),
                 (select now()),  
                 ${parseFloat(medicion.f_card.length === 0 ? 0 : medicion.f_card)},  
                 ${parseFloat(medicion.f_resp.length === 0 ? 0 : medicion.f_resp)},  
                 ${parseFloat(medicion.sato.length === 0 ? 0 : medicion.sato)},  
                 ${parseFloat(medicion.hgt.length === 0 ? 0 : medicion.hgt)})`
        let rowsAMedicion = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaMedicion);

        let medicionId = rowsAMedicion[0].insertId

        let [existeConsulta] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`select * from vesalio.consulta where turno_id = ${turno}`);

        if (existeConsulta.length === 0) {
            var consultaConsulta = `insert into vesalio.consulta
                (turno_id,fechahorainicio,created_at,created_by,personal_id )
                values(
                ${turno},
                (SELECT now()),
                (SELECT now()),
                (SELECT 
                    u.id 
                 FROM vesalio.usuario u
                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                 WHERE documento ='${documento}'),
                 (SELECT
                    pl.id
                 FROM vesalio.personal pl
                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                 WHERE documento ='${documento}'))`

            let rowsConsulta = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaConsulta);
            let consultaId = rowsConsulta[0].insertId

            var consultaConsultaDetalle = `insert into vesalio.consultadetalle
                (consulta_id,creado_en )
                values(
                ${consultaId},
                (SELECT now())
               )`
            let rowsConsultaDetalle = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaConsultaDetalle);
            let consultaIdDetalleId = rowsConsultaDetalle[0].insertId
            var consultaEnfermeria = `insert into vesalio.enfermeria
                                (id,medicion_id,detalle_actuacion,criterio_turno,especialidad_turno) 
                        values(
                ${consultaIdDetalleId},
                ${medicionId},
                '${comentario}',
                ${parseInt(criterio)},
                ${parseInt(especialidad)})`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaEnfermeria);

            var consulta2 = `INSERT INTO vesalio.eventohc 
        (tipocontenido_id,persona_id, fechahora,datos, lft, rgt, lvl, created_at,updated_at,creadopor_id) 
        values
        (
            20,
            (SELECT 
                id 
             FROM vesalio.persona p 
             WHERE p.documento = '${persona}'),
            (SELECT now()),
            '${consultaId}',
            1,
            2,
            0,  
            (SELECT now()),
            (SELECT now()) ,
            (SELECT 
                u.id 
             FROM vesalio.usuario u
             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
             WHERE documento ='${documento}')
        )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`INSERT INTO vesalio.eventohc 
        (tipocontenido_id,persona_id, fechahora,datos, lft, rgt, lvl, created_at,updated_at,creadopor_id) 
        values
        (
            9,
            (SELECT 
                id 
             FROM vesalio.persona p 
             WHERE p.documento = '${persona}'),
            (SELECT now()),
            '${consultaId}',
            1,
            2,
            0,  
            (SELECT now()),
            (SELECT now()) ,
            (SELECT 
                u.id 
             FROM vesalio.usuario u
             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
             WHERE documento ='${documento}')

        )`);
            var eventos = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`update vesalio.turno_programado set estado_turno_id = 5,consulta_id = ${consultaId} where id = ${turno}`);
            var consulta4 = `insert into vesalio.turno_programado
                        (agenda_id,persona_id,estado_turno_id,orden,fecha,hora,sobreturno,created_at,created_by,updated_at,modified_by,tipovezqueconsulta,por_callcenter,confirmado_por_paciente,turno_portal_condicional) 
                        values(
                                (select 
                                    a.id
                                from vesalio.agenda a
                                inner join vesalio.asignacion s on a.asignacion_id = s.id 
                                where s.especialidad_id = ${especialidad} and activo  = 1 and 
                                      dia = (select dia_de_la_semana from vesalio.calendario where fecha_calendario =(SELECT DATE(NOW())))
                                limit 1),
                                (SELECT 
                                    id 
                                 FROM vesalio.persona p 
                                 WHERE p.documento = '${persona}'),
                                1,
                                1, 
                                (SELECT DATE(NOW())),
                                (SELECT DATE_FORMAT( NOW() ,  '%H:%i' )),
                                0,
                                (select now()),
                                (SELECT 
                                    u.id 
                                 FROM vesalio.usuario u
                                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                 WHERE documento ='${documento}'),
                                 (select now()),
                                (SELECT 
                                    u.id 
                                 FROM vesalio.usuario u
                                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                 WHERE documento ='${documento}'),
                                1,
                                0,
                                1,
                                0
                        )`

            let turnoNuevo = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);


            var consulta5 = `insert into vesalio.internacion_persona 
        (persona_id,borrado_logico,creado_en,modificado_en,evento_id) 
        values(
                (SELECT 
                    id 
                 FROM vesalio.persona p 
                 WHERE p.documento = '${persona}'),
                0,  
                (select now()),
                (select now()),
                ${eventos[0].insertId}
                
        )`
            let rowsInternacion = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta5);
            let internacionId = rowsInternacion[0].insertId

            var consultaControl = `insert into vesalio.internacion_hoja_enfermeria_controles
                                (creado_por_id,persona_internacion_id,tension_minima,tension_maxima,fc,fr,saturacion,peso,tempaxil,creado_en,hgt,hora_med,comentario)
                                values(
                                        (SELECT 
                                            u.id 
                                        FROM vesalio.usuario u
                                        INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                        INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                        WHERE documento ='${documento}'),
                                        ${internacionId},
                                        ${parseFloat(medicion.tension_arterial_minima.length === 0 ? 0 : medicion.tension_arterial_minima)},
                                        ${parseFloat(medicion.tension_arterial_maxima.length === 0 ? 0 : medicion.tension_arterial_maxima)},
                                        ${parseFloat(medicion.f_card.length === 0 ? 0 : medicion.f_card)},  
                                        ${parseFloat(medicion.f_resp.length === 0 ? 0 : medicion.f_resp)},  
                                        ${parseFloat(medicion.sato.length === 0 ? 0 : medicion.sato)},  
                                        ${parseFloat(medicion.peso.length === 0 ? 0 : medicion.peso)},
                                        ${parseFloat(medicion.temperatura.length === 0 ? 0 : medicion.temperatura)},  
                                        (select now()),
                                        ${parseFloat(medicion.hgt.length === 0 ? 0 : medicion.hgt)},
                                        (select now()),
                                        '${comentario}'
                                    )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaControl);

            var consulta6 = `insert into vesalio.internacion_movimiento 
        (persona_internacion_id,cama_id,tipo_evento_id,origen_id,destino_id,fecha_hora_evento,borrado_logico,creado_en) 
        values(
               ${internacionId},
               ${camaSelected},  
               2,
               34,
               34,
               (select now()),
               0,
               (select now())
                )`

            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta6);
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`insert into vesalio.no_mostrar_internacion_emergencia values('${persona}',${medicionId},${turnoNuevo[0].insertId},${internacionId},1)`);

            res.status(200).json('correcto')
        }
        else {
            res.status(200).json({ error: 'Verifique que la consulta no se encuentre regsitrada' })

        }

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el triaje.' })
    }
}
const insertBalance = async (req, res) => {
    try {
        const { medicion, documento, personaInternacion } = req.body;

        var consultaControl = `insert into vesalio.internacion_hoja_enfermeria_controles
                                (creado_por_id,persona_internacion_id,tension_minima,tension_maxima,fc,fr,saturacion,peso,tempaxil,creado_en,hgt,hora_med,comentario)
                                values(
                                        (SELECT 
                                            u.id 
                                        FROM vesalio.usuario u
                                        INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                        INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                        WHERE documento ='${documento}'),
                                        ${personaInternacion},
                                        ${parseFloat(medicion.tension_arterial_minima.length === 0 ? 0 : medicion.tension_arterial_minima)},
                                        ${parseFloat(medicion.tension_arterial_maxima.length === 0 ? 0 : medicion.tension_arterial_maxima)},
                                        ${parseFloat(medicion.f_card.length === 0 ? 0 : medicion.f_card)},  
                                        ${parseFloat(medicion.f_resp.length === 0 ? 0 : medicion.f_resp)},  
                                        ${parseFloat(medicion.sato.length === 0 ? 0 : medicion.sato)},  
                                        ${parseFloat(medicion.peso.length === 0 ? 0 : medicion.peso)},
                                        ${parseFloat(medicion.temperatura.length === 0 ? 0 : medicion.temperatura)},  
                                        (select now()),
                                        ${parseFloat(medicion.hgt.length === 0 ? 0 : medicion.hgt)},
                                        (select now()),
                                        '${medicion.comentario}'
                                    )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaControl);


        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el triaje.' })
    }
}
// este esta en veremos
const insertIngresos = async (req, res) => {
    try {
        const { ingresos, documento, egresos, personaInternacion } = req.body;


        for await (var num of ingresos) {
            var consultaControl = `insert into vesalio.internacion_hoja_enfermeria_ingresos
            (creado_por_id,persona_internacion_id,hora,cantidad,ritmo,oral,sng,creado_en,buscarSistcomp,tipo)
            values(
                    (SELECT 
                        u.id 
                    FROM vesalio.usuario u
                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                    WHERE documento ='${documento}'),
                    ${personaInternacion},
                    (select  current_time() ),
                    ${num.cantidad.length === 0 ? 0 : num.cantidad},
                    ${num.intravenosa.length === 0 ? 0 : num.intravenosa},
                    ${num.oral.length === 0 ? 0 : num.oral},
                    ${num.sanguinea.length === 0 ? 0 : num.sanguinea},
                    (SELECT 
                        u.id 
                    FROM vesalio.usuario u
                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                    WHERE documento ='${documento}'),    
                    '${medicion.medicamento}',
                    '${medicion.tipo}'
                )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaControl);


        }
        for await (var num of egresos) {
            var consultaControl = `insert into vesalio.internacion_hoja_enfermeria_ingresos
            (creado_por_id,persona_internacion_id,hora,cantidad,ritmo,oral,sng,creado_en,buscarSistcomp,tipo)
            values(
                    (SELECT 
                        u.id 
                    FROM vesalio.usuario u
                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                    WHERE documento ='${documento}'),
                    ${personaInternacion},
                    (select  current_time() ),
                    ${num.cantidad.length === 0 ? 0 : num.cantidad},
                    ${num.intravenosa.length === 0 ? 0 : num.intravenosa},
                    ${num.oral.length === 0 ? 0 : num.oral},
                    ${num.sanguinea.length === 0 ? 0 : num.sanguinea},
                    (SELECT 
                        u.id 
                    FROM vesalio.usuario u
                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                    WHERE documento ='${documento}'),    
                    '${medicion.medicamento}',
                    '${medicion.tipo}'
                )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaControl);
        }





        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el triaje.' })
    }
}
//


const getTurnoProgamadoListaFechaMedico = async (req, res) => {
    try {
        const { fecha, doctor, tipo_paciente, paciente, tipo_usuario } = req.body
        var filtro = []
        if (fecha.length > 0) {
            filtro.push(`fecha='${fecha.split('T')[0]}'`)
        }
        // if (especialidad !== null) {
        //     filtro.push(`especialidad_id=${especialidad}`)
        // }

        if (paciente !== null) {
            if (tipo_paciente === 'documento_paciente') {
                filtro.push(`documento_paciente = '${paciente}'`)
            }
            if (tipo_paciente === 'nombre_paciente') {
                filtro.push(`nombre_paciente like '%${paciente}%'`)
            }
        }
        if (tipo_usuario === '09') {
            filtro.push(`especialidad_id  in (335,336)`)
        } else if (tipo_usuario === '03') {
            let listaArray = [
                '07839267',
                '43488483',
                '18121657',
                '29483239',
                '08332557',
                '44385442',
                '002330722',
                '07217727',
                '09976772',
                '09736568',
                '21498409',
                '002605350',
                '43177080']
            const [rowsArray] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`select 
                                                                                                            especialidad_id
                                                                                                        from vesalio.asignacion s
                                                                                                        inner join vesalio.personal pl on s.personal_id = pl.id
                                                                                                        inner join vesalio.persona p on p.id = pl.persona_id
                                                                                                        where  documento in ('${doctor}') 
                                                                                                            group by especialidad_id`);
            if (listaArray.find(x => x === doctor) === undefined) {
                if (doctor !== null) {
                    filtro.push(`documento_doctor= '${doctor}'`)
                }
            } else {
                console.log(rowsArray);
                filtro.push(`especialidad_id in (${rowsArray.map(x => x.especialidad_id).join(',')}) `)
            }
        }

        var consulta = `SELECT 
                            *
                        FROM(SELECT 
                                tp.id,
                                tp.agenda_id,
                                CONCAT(p1.apellidos,' ',p1.nombres) nombre_paciente,
                                p1.documento documento_paciente,
                                CONCAT(p.apellidos,' ',p.nombres) nombre_doctor,
                                p.documento documento_doctor ,
                                tp.fecha,
                                tp.hora,
                                a.asignacion_id,
                                ag.especialidad_id,
                                ag.personal_id,
                                pr.persona_id persona_id_doctor,
                                tp.persona_id persona_id_paciente,
                                ep.nombre especialidad_nombre,
                                et.nombre estado,
                                tp.estado_turno_id,
                                a.lugar_id,
                                a.piso_id,
                                a.area_servicio_id,
                                l.nombre lugar_nombre,
                                piso.nombre piso_nombre,
                                (select 
                                    criterio_turno 
                                from vesalio.enfermeria where id = (select 
                                                                        cd.id
                                                                    from vesalio.eventohc hc
                                                                    inner join vesalio.consulta c on c.id = hc.datos
                                                                    inner join vesalio.consultadetalle cd on cd.consulta_id = c.id
                                                                    where hc.id = (select 
                                                                                        ip.evento_id 
                                                                                    from  vesalio.no_mostrar_internacion_emergencia noie
                                                                                    inner join vesalio.internacion_persona ip on ip.id=noie.persona_internacion_id
                                                                                    where turno_id = tp.id ))) grado_emergencia,
                                asv.nombre area_servicio_nombre
                                FROM vesalio.turno_programado tp
                                INNER JOIN vesalio.agenda a ON tp.agenda_id = a.id
                                INNER JOIN vesalio.asignacion ag ON ag.id = a.asignacion_id
                                INNER JOIN vesalio.especialidad ep ON ep.id=ag.especialidad_id
                                INNER JOIN vesalio.personal pr ON pr.id = ag.personal_id
                                INNER JOIN vesalio.persona p ON p.id = pr.persona_id
                                INNER JOIN vesalio.persona p1 ON p1.id = tp.persona_id
                                INNER JOIN vesalio.estado_turno et ON et.id = tp.estado_turno_id
                                INNER JOIN vesalio.lugar l ON l.id = a.lugar_id
                                INNER JOIN vesalio.piso piso ON piso.id = a.piso_id
                                INNER JOIN vesalio.area_servicio asv ON asv.id = a.area_servicio_id
                        ) datos  WHERE ${filtro.join(' and ')} order by fecha,hora,nombre_doctor`

        var tmp = []
        var tmpFinal = []
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        for await (var num of rows) {
            const result = await sql.query`select * from BDSistComp.dbo.historias where Nro_DocIdenti=${num.documento_paciente}`
            tmp.push({
                ...num,
                historia: result.recordset.length === 0 ? 'Sin historia' : result.recordset[0].Nro_Historia,
                Nro_TelMovil: result.recordset.length === 0 ? '-' : result.recordset[0].Nro_TelMovil
            })
        }

        for await (var num of tmp) {

            if (tipo_usuario === '09') {
                tmpFinal.push(num)
            } else {
                if ([331, 332, 333, 334, 337, 338, 339].filter(x => x === num.especialidad_id).length === 0) {
                    if (num.documento_doctor === doctor) {
                        tmpFinal.push(num)
                    }
                } else {
                    tmpFinal.push(num)
                }
            }


        }
        res.status(200).json(tmpFinal)
    } catch (e) {
        console.log(e);
        res.status(200).json([])
    }

}
const getHistoriaPaciente = async (req, res) => {
    try {
        var id = req.params.id
        var consulta = `
                        SELECT
                            documento
                        FROM vesalio.turno_programado tp 
                        INNER JOIN vesalio.persona p ON p.id = tp.persona_id
                        WHERE tp.id = ${id}`
        const [documentoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        if (documentoRows.length > 0) {
            let numero = documentoRows[0].documento
            const result = await sql.query(`select * from BDSistComp.dbo.historias where Nro_DocIdenti='${numero}'`)
            var consulta2 = `SELECT 
                                e.nombre,
                                a.asignacion_id,
                                s.especialidad_id,
                                tp.agenda_id
                            FROM vesalio.turno_programado tp 
                            INNER JOIN vesalio.persona p ON tp.persona_id = p.id
                            INNER JOIN vesalio.agenda a ON tp.agenda_id = a.id
                            INNER JOIN vesalio.asignacion s ON a.asignacion_id = s.id
                            INNER JOIN vesalio.especialidad e ON e.id=s.especialidad_id
                            WHERE p.documento = '${numero}'
                          `
            const [sidebarRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);

            var consulta3 = `SELECT 
                                d.*,
                                ap.id idPatologico,
                                ap.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ap.creado_en
                            FROM vesalio.antecedentepatologico ap
                            INNER JOIN vesalio.diagnostico d ON ap.diagnostico_id = d.id
                            INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ap.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE p.documento = '${numero}' and ap.eliminadopor_id is null`
            const [patologicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

            var consulta4 = `SELECT 
                                np.*,
                                np.comentario nombre,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                np.creado_en
                            FROM  vesalio.antecedenteNOpatologico np
                            INNER JOIN vesalio.persona p ON np.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = np.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento ='${numero}' and np.eliminadopor_id is null`
            const [noPatologicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);
            var consulta5 = `SELECT 
                                ac.id,
                                CONCAT(a.nombre,' ',atp.dosis, ' ',tu.nombre,' ',tp.nombre) nombre,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                va.nombre via_administracion,
                                concat(cantidad, ' CADA ',ac.frecuencia_cantidad, ' ',f.nombre) cadaTiempo,
                                ac.observacion comentario,
                                ac.creado_en
                            FROM  vesalio.articulocronico ac
                            inner join vesalio.viaadministracion va on va.id=ac.via_administracion_id
                            inner join vesalio.frecuencia f on f.id=ac.frecuencia_id
                            INNER JOIN vesalio.articulo_tipopresentacion atp ON atp.id=ac.articulotipopresentacion_id
                            INNER JOIN vesalio.tipopresentacion tp ON tp.id = atp.tipopresentacion_id
                            INNER JOIN vesalio.tipounidadmedida tu ON tu.id=atp.tipounidadmedida_id
                            INNER JOIN vesalio.articulo a ON a.id=atp.articulo_id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            inner join vesalio.usuario u on u.id=ac.creado_por_id
                            INNER JOIN vesalio.personal pl on pl.id = u.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id 
                            WHERE ac.borrado_logico =0 and  p.documento ='${numero}'`
            const [medicamentosoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta5);

            var consulta6 = `SELECT 
                                d.*,
                                ac.id idPatologico,
                                ac.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ac.creado_en,
                                frol.nombre familiar
                            FROM  vesalio.antecedenteheredofamiliar ac
                            inner join vesalio.familiarol frol on frol.id=ac.familiarrol_id
                            INNER JOIN vesalio.diagnostico d ON ac.diagnostico_id = d.id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ac.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento =  '${numero}' and ac.eliminadopor_id is null`
            const [heredoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta6);
            var consulta7 = `SELECT 
                                e.*,
                                ac.id idPatologico,
                                ac.fecha_cirugia,
                                ac.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ac.creado_en
                            FROM  vesalio.antecedentequirurgico ac
                            INNER JOIN vesalio.estudio e ON ac.estudio_id=e.id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ac.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento = '${numero}' and ac.eliminadopor_id is null`
            const [quirurgicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta7);
            var consulta8 = `SELECT * FROM (
                                SELECT
                                'Tabaco' nombre,
                                tabaco valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Alcohol' nombre,
                                alcohol valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Drogas' nombre,
                                drogas valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Otros' nombre,
                                otros valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                ) datos WHERE valor =1
                                ORDER BY nombre `

            const [habitoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta8);

            var consulta9 = `SELECT 
                                ehc.id evento_id,
                                ehc.tipocontenido_id,
                                tc.nombre tipoContenido,
                                DATE_FORMAT(ehc.fechahora, "%e/%c/%Y %H:%i") fechahora ,
                                ehc.datos,
                                CONCAT(p.apellidos,' ' ,p.nombres) doctor,
                                p.documento,
                                p.genero,
                                if(tp.id IS NULL,'',(SELECT e.nombre FROM vesalio.agenda a INNER JOIN vesalio.asignacion s ON a.asignacion_id = s.id INNER JOIN vesalio.especialidad e ON e.id = s.especialidad_id WHERE a.id = tp.agenda_id LIMIT 1)) especialidad 
                                -- (SELECT nombre FROM vesalio.especialidad WHERE id = (SELECT especialidad_id FROM vesalio.asignacion s WHERE s.personal_id = u.personal_id LIMIT 1)) especialidad
                            FROM vesalio.eventohc ehc
                            INNER JOIN vesalio.usuario u ON ehc.creadopor_id = u.id
                            INNER JOIN vesalio.personal pl ON pl.id=u.personal_id
                            INNER JOIN vesalio.persona p ON p.id = pl.persona_id
                            INNER JOIN vesalio.persona p2 ON p2.id=ehc.persona_id
                            INNER JOIN vesalio.tipocontenido tc ON tc.id = ehc.tipocontenido_id
                            LEFT JOIN vesalio.turno_programado tp ON tp.consulta_id = ehc.datos
                            WHERE p2.documento =  '${numero}' and ehc.tipocontenido_id not in (20)
                            ORDER BY ehc.id DESC limit 10`

            const [historialRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta9);

            var consulta11 = `SELECT 
                                    CONCAT(s.nombre,'/ ',ih.nombre,'/ ', c.nombre) ubicacion,
                                    case 
                                        when s.id = 67 then 1
                                        when s.id != 67 then 0
                                    END isEmergencia,
                                    m.*
                                FROM vesalio.internacion_movimiento m
                                INNER JOIN vesalio.internacion_cama c ON c.id = m.cama_id
                                INNER JOIN vesalio.internacion_habitacion ih ON c.habitacion_id = ih.id
                                INNER JOIN vesalio.internacion_sala s ON s.id=ih.sala_id
                                WHERE persona_internacion_id IN (SELECT 
                                                                    i.id 
                                                                 FROM vesalio.internacion_persona i
                                                                 INNER JOIN vesalio.persona p ON p.id=i.persona_id
                                                                 WHERE documento = '${numero}'  AND evento_id IS not  null) AND 
                                        siguiente_evento_id IS NULL AND 
                                        tipo_evento_id  NOT IN (5,11)
                                ORDER BY m.id desc`

            const [emergenciaRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta11);

            res.status(200).json({
                datos: result.recordset,
                sidebar: sidebarRows,
                botonEmergencia: emergenciaRows,
                antecedentes: {
                    patologicos: patologicoRows,
                    noPatologicos: noPatologicoRows,
                    medicamentos: medicamentosoRows,
                    heredoFamiliar: heredoRows,
                    quirurgico: quirurgicoRows,
                    habito: habitoRows,
                },
                historial: historialRows
            })
        }
        else {
            res.status(200).json({
                error: 'error'
            })
        }


    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getHistoriaPacienteEnfermera = async (req, res) => {
    try {
        var numero = req.params.id

        const result = await sql.query(`select * from BDSistComp.dbo.historias where Nro_DocIdenti='${numero}'`)
        var consulta2 = `SELECT 
                                e.nombre,
                                a.asignacion_id,
                                s.especialidad_id,
                                tp.agenda_id
                            FROM vesalio.turno_programado tp 
                            INNER JOIN vesalio.persona p ON tp.persona_id = p.id
                            INNER JOIN vesalio.agenda a ON tp.agenda_id = a.id
                            INNER JOIN vesalio.asignacion s ON a.asignacion_id = s.id
                            INNER JOIN vesalio.especialidad e ON e.id=s.especialidad_id
                            WHERE p.documento = '${numero}'
                          `
        const [sidebarRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);

        var consulta3 = `SELECT 
                                d.*,
                                ap.id idPatologico,
                                ap.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ap.creado_en
                            FROM vesalio.antecedentepatologico ap
                            INNER JOIN vesalio.diagnostico d ON ap.diagnostico_id = d.id
                            INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ap.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE p.documento = '${numero}' and ap.eliminadopor_id is null`
        const [patologicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        var consulta4 = `SELECT 
                                np.*,
                                np.comentario nombre,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                np.creado_en
                            FROM  vesalio.antecedenteNOpatologico np
                            INNER JOIN vesalio.persona p ON np.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = np.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento ='${numero}' and np.eliminadopor_id is null`
        const [noPatologicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);
        var consulta5 = `SELECT 
                                ac.id,
                                CONCAT(a.nombre,' ',atp.dosis, ' ',tu.nombre,' ',tp.nombre) nombre,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                va.nombre via_administracion,
                                concat(cantidad, ' CADA ',ac.frecuencia_cantidad, ' ',f.nombre) cadaTiempo,
                                ac.observacion comentario,
                                ac.creado_en
                            FROM  vesalio.articulocronico ac
                            inner join vesalio.viaadministracion va on va.id=ac.via_administracion_id
                            inner join vesalio.frecuencia f on f.id=ac.frecuencia_id
                            INNER JOIN vesalio.articulo_tipopresentacion atp ON atp.id=ac.articulotipopresentacion_id
                            INNER JOIN vesalio.tipopresentacion tp ON tp.id = atp.tipopresentacion_id
                            INNER JOIN vesalio.tipounidadmedida tu ON tu.id=atp.tipounidadmedida_id
                            INNER JOIN vesalio.articulo a ON a.id=atp.articulo_id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            inner join vesalio.usuario u on u.id=ac.creado_por_id
                            INNER JOIN vesalio.personal pl on pl.id = u.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id 
                            WHERE ac.borrado_logico =0 and  p.documento ='${numero}'`
        const [medicamentosoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta5);

        var consulta6 = `SELECT 
                                d.*,
                                ac.id idPatologico,
                                ac.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ac.creado_en,
                                frol.nombre familiar
                            FROM  vesalio.antecedenteheredofamiliar ac
                            inner join vesalio.familiarol frol on frol.id=ac.familiarrol_id
                            INNER JOIN vesalio.diagnostico d ON ac.diagnostico_id = d.id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ac.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento =  '${numero}' and ac.eliminadopor_id is null`
        const [heredoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta6);
        var consulta7 = `SELECT 
                                e.*,
                                ac.id idPatologico,
                                ac.fecha_cirugia,
                                ac.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ac.creado_en
                            FROM  vesalio.antecedentequirurgico ac
                            INNER JOIN vesalio.estudio e ON ac.estudio_id=e.id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ac.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento = '${numero}' and ac.eliminadopor_id is null`
        const [quirurgicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta7);
        var consulta8 = `SELECT * FROM (
                                SELECT
                                'Tabaco' nombre,
                                tabaco valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Alcohol' nombre,
                                alcohol valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Drogas' nombre,
                                drogas valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Otros' nombre,
                                otros valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                ) datos WHERE valor =1
                                ORDER BY nombre `

        const [habitoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta8);

        var consulta9 = `SELECT 
                                ehc.id evento_id,
                                ehc.tipocontenido_id,
                                tc.nombre tipoContenido,
                                DATE_FORMAT(ehc.fechahora, "%e/%c/%Y %H:%i") fechahora ,
                                ehc.datos,
                                CONCAT(p.apellidos,' ' ,p.nombres) doctor,
                                p.documento,
                                p.genero,
                                if(tp.id IS NULL,'',(SELECT e.nombre FROM vesalio.agenda a INNER JOIN vesalio.asignacion s ON a.asignacion_id = s.id INNER JOIN vesalio.especialidad e ON e.id = s.especialidad_id WHERE a.id = tp.agenda_id LIMIT 1)) especialidad 
                                -- (SELECT nombre FROM vesalio.especialidad WHERE id = (SELECT especialidad_id FROM vesalio.asignacion s WHERE s.personal_id = u.personal_id LIMIT 1)) especialidad
                            FROM vesalio.eventohc ehc
                            INNER JOIN vesalio.usuario u ON ehc.creadopor_id = u.id
                            INNER JOIN vesalio.personal pl ON pl.id=u.personal_id
                            INNER JOIN vesalio.persona p ON p.id = pl.persona_id
                            INNER JOIN vesalio.persona p2 ON p2.id=ehc.persona_id
                            INNER JOIN vesalio.tipocontenido tc ON tc.id = ehc.tipocontenido_id
                            LEFT JOIN vesalio.turno_programado tp ON tp.consulta_id = ehc.datos
                            WHERE p2.documento =  '${numero}' and ehc.tipocontenido_id not in (20)
                            ORDER BY ehc.id DESC limit 10`

        const [historialRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta9);

        var consulta11 = `SELECT 
                                    CONCAT(s.nombre,'/ ',ih.nombre,'/ ', c.nombre) ubicacion,
                                    case 
                                        when s.id = 67 then 1
                                        when s.id != 67 then 0
                                    END isEmergencia,
                                    m.*
                                FROM vesalio.internacion_movimiento m
                                INNER JOIN vesalio.internacion_cama c ON c.id = m.cama_id
                                INNER JOIN vesalio.internacion_habitacion ih ON c.habitacion_id = ih.id
                                INNER JOIN vesalio.internacion_sala s ON s.id=ih.sala_id
                                WHERE persona_internacion_id IN (SELECT 
                                                                    i.id 
                                                                 FROM vesalio.internacion_persona i
                                                                 INNER JOIN vesalio.persona p ON p.id=i.persona_id
                                                                 WHERE documento = '${numero}'  AND evento_id IS not  null) AND 
                                        siguiente_evento_id IS NULL AND 
                                        tipo_evento_id  NOT IN (5,11)
                                ORDER BY m.id desc`

        const [emergenciaRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta11);

        res.status(200).json({
            datos: result.recordset,
            sidebar: sidebarRows,
            botonEmergencia: emergenciaRows,
            antecedentes: {
                patologicos: patologicoRows,
                noPatologicos: noPatologicoRows,
                medicamentos: medicamentosoRows,
                heredoFamiliar: heredoRows,
                quirurgico: quirurgicoRows,
                habito: habitoRows,
            },
            historial: historialRows
        })



    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getHistoriaPacienteAntecedentes = async (req, res) => {
    try {
        var numero = req.params.id
        var consulta3 = `SELECT 
                                d.*,
                                ap.id idPatologico,
                                ap.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ap.creado_en
                            FROM vesalio.antecedentepatologico ap
                            INNER JOIN vesalio.diagnostico d ON ap.diagnostico_id = d.id
                            INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ap.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE p.documento = '${numero}' and ap.eliminadopor_id is null`
        const [patologicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        var consulta4 = `SELECT 
                                np.*,
                                np.comentario nombre,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                np.creado_en
                            FROM  vesalio.antecedenteNOpatologico np
                            INNER JOIN vesalio.persona p ON np.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = np.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento ='${numero}' and np.eliminadopor_id is null`
        const [noPatologicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);
        var consulta5 = `SELECT 
                                ac.id,
                                CONCAT(a.nombre,' ',atp.dosis, ' ',tu.nombre,' ',tp.nombre) nombre,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                va.nombre via_administracion,
                                concat(cantidad, ' CADA ',ac.frecuencia_cantidad, ' ',f.nombre) cadaTiempo,
                                ac.observacion comentario,
                                ac.creado_en
                            FROM  vesalio.articulocronico ac
                            inner join vesalio.viaadministracion va on va.id=ac.via_administracion_id
                            inner join vesalio.frecuencia f on f.id=ac.frecuencia_id
                            INNER JOIN vesalio.articulo_tipopresentacion atp ON atp.id=ac.articulotipopresentacion_id
                            INNER JOIN vesalio.tipopresentacion tp ON tp.id = atp.tipopresentacion_id
                            INNER JOIN vesalio.tipounidadmedida tu ON tu.id=atp.tipounidadmedida_id
                            INNER JOIN vesalio.articulo a ON a.id=atp.articulo_id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            inner join vesalio.usuario u on u.id=ac.creado_por_id
                            INNER JOIN vesalio.personal pl on pl.id = u.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id 
                            WHERE ac.borrado_logico =0 and  p.documento ='${numero}'`
        const [medicamentosoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta5);

        var consulta6 = `SELECT 
                                d.*,
                                ac.id idPatologico,
                                ac.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ac.creado_en,
                                frol.nombre familiar
                            FROM  vesalio.antecedenteheredofamiliar ac
                            inner join vesalio.familiarol frol on frol.id=ac.familiarrol_id
                            INNER JOIN vesalio.diagnostico d ON ac.diagnostico_id = d.id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ac.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento =  '${numero}' and ac.eliminadopor_id is null`
        const [heredoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta6);
        var consulta7 = `SELECT 
                                e.*,
                                ac.id idPatologico,
                                ac.fecha_cirugia,
                                ac.comentario,
                                concat(p2.apellidos, ' ', p2.nombres) profesional,
                                ac.creado_en
                            FROM  vesalio.antecedentequirurgico ac
                            INNER JOIN vesalio.estudio e ON ac.estudio_id=e.id
                            INNER JOIN vesalio.persona p ON ac.persona_id = p.id
                            INNER JOIN vesalio.personal pl on pl.id = ac.personal_id
                            INNER JOIN vesalio.persona p2 ON pl.persona_id = p2.id
                            WHERE  p.documento = '${numero}' and ac.eliminadopor_id is null`
        const [quirurgicoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta7);
        var consulta8 = `SELECT * FROM (
                                SELECT
                                'Tabaco' nombre,
                                tabaco valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Alcohol' nombre,
                                alcohol valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Drogas' nombre,
                                drogas valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                UNION ALL 
                                SELECT
                                'Otros' nombre,
                                otros valor
                                FROM vesalio.antecedentehabitonocivo ap
                                INNER JOIN vesalio.persona p ON ap.persona_id = p.id
                                WHERE p.documento = '${numero}'
                                ) datos WHERE valor =1
                                ORDER BY nombre `

        const [habitoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta8);


        res.status(200).json({
            antecedentes: {
                patologicos: patologicoRows,
                noPatologicos: noPatologicoRows,
                medicamentos: medicamentosoRows,
                heredoFamiliar: heredoRows,
                quirurgico: quirurgicoRows,
                habito: habitoRows,
            }
        })



    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getDiagnosticos = async (req, res) => {
    try {
        var id = req.params.id
        var consulta = `select * from (SELECT 
                            d.*,concat(d.codigocie10,'-',d.nombre) label
                        FROM vesalio.diagnostico d
                        WHERE es_patologico = 0 AND auditado = 0 and borrado_logico = 0) datos where label like '%${id}%'`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        res.status(200).json(rows)
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getMedicamentos = async (req, res) => {
    try {
        var id = req.params.id
        const result = await sql.query(`execute BDSistComp.dbo.lista_articulos_v1 @q='${id}'`)
        /*
        var consulta = `SELECT 
                            atp.id id,
                            CONCAT(a.nombre,' ',atp.dosis, ' ',tu.nombre,' ',tp.nombre) label
                        FROM  vesalio.articulo_tipopresentacion atp 
                        INNER JOIN vesalio.tipopresentacion tp ON tp.id = atp.tipopresentacion_id
                        INNER JOIN vesalio.tipounidadmedida tu ON tu.id=atp.tipounidadmedida_id
                        INNER JOIN vesalio.articulo a ON a.id=atp.articulo_id
                        WHERE  CONCAT(a.nombre,' ',atp.dosis, ' ',tu.nombre,' ',tp.nombre) like '${id}%'  and atp.borrado_logico = 0`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        */

        res.status(200).json(result.recordset)
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getNoMostrarEmergencia = async (req, res) => {
    try {
        var id = req.params.id
        var consulta = `SELECT 
                           *
                        FROM  vesalio.no_mostrar_internacion_emergencia 
                        WHERE  documento = '${id}'`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);


        res.status(200).json({ lista: rows })
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getMedicionEmergenciaEnfermeria = async (req, res) => {
    try {
        var id = req.params.id
        var consulta = `SELECT * FROM vesalio.internacion_hoja_enfermeria_controles where persona_internacion_id =  ${id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);


        res.status(200).json({ mediciones: rows })
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getMedicionAmulatorioEmergencia = async (req, res) => {
    try {
        var id = req.params.id
        var consulta = `select * from vesalio.medicion where id = (SELECT 
            medicion_id
                    FROM  vesalio.no_mostrar_internacion_emergencia 
                    WHERE  documento = '${id}')`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);


        res.status(200).json({ mediciones: rows })
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getEstudios = async (req, res) => {
    try {
        var id = req.params.id
        var consulta = `select 
                            id,
                            concat(nombre,' (',sinonimo,')') label 
                        from vesalio.estudio  WHERE borrado_logico = 0  and concat(nombre,' (',sinonimo,')') like '%${id}%'`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        res.status(200).json(rows)
    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getFrecuencia_viaAdministracion = async (req, res) => {
    try {
        var consulta = `SELECT * FROM vesalio.frecuencia`
        const [rowsFrecuencia] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        var consulta2 = `select * from vesalio.viaadministracion order by nombre`
        const [rowsVia] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);
        var consulta2 = `select * from vesalio.tipounidadmedida order by nombre`
        const [rowsUnidadMedida] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);
        res.status(200).json({
            frecuencia: rowsFrecuencia,
            viaAdministracion: rowsVia,
            unidadMedida: rowsUnidadMedida
        })
    } catch (e) {
        console.log(e);
        res.status(400).json('error')
    }
}
const getFamiliaRol = async (req, res) => {
    try {
        var consulta = `SELECT * FROM vesalio.familiarol GROUP BY nombre ORDER BY gf_orden`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        res.status(200).json(rows)
    } catch (e) {
        console.log(e);
        res.status(400).json('error')
    }
}
const getAntecedentePatologico = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            d.*,
                            ap.id idPatologico,
                            ap.comentario
                        FROM vesalio.antecedentepatologico ap
                        INNER JOIN vesalio.diagnostico d ON ap.diagnostico_id = d.id
                        WHERE ap.id =${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        res.status(200).json(rows)

    } catch (e) {
        res.status(400).json({
            error: 'error'
        })
    }
}
const insertAntecedentePatologico = async (req, res) => {
    try {
        const { documento, comentario, diagnostico, persona } = req.body;

        let consultaExiste = `select 
                                count(*) cantidad
                               from vesalio.antecedentepatologico ap 
                               inner join vesalio.persona p  on p.id = ap.persona_id
                               where diagnostico_id = ${diagnostico} and p.documento ='${persona}' and eliminadopor_id is null `

        let [rowsExiste] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaExiste);
        if (parseInt(rowsExiste[0].cantidad) === 0) {
            var consulta = `INSERT INTO vesalio.antecedentepatologico
                        (diagnostico_id,persona_id,comentario,personal_id,creado_en,borrado_en,creadopor_id) 
                        values
                        (${diagnostico},
                        (SELECT 
                            id 
                        FROM vesalio.persona p 
                        WHERE p.documento = '${persona}'),
                        '${comentario}',
                        (SELECT
                            pl.id
                        FROM vesalio.personal pl
                        INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                        WHERE documento ='${documento}'),
                        (SELECT now()),
                        (SELECT now()),
                        (SELECT 
                                u.id 
                        FROM vesalio.usuario u
                        INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                        INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                        WHERE documento ='${documento}'))`
            let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
            res.status(200).json('correcto')
        } else {
            res.status(200).json({ error: 'No se puede ingresar el mismo diagnóstico.' })
        }


    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const removeAntecedentePatologico = async (req, res) => {
    try {
        const { documento, id } = req.body;
        var consulta = `update vesalio.antecedentepatologico set eliminadopor_id = (SELECT 
                                                                                        u.id 
                                                                                    FROM vesalio.usuario u
                                                                                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                                                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                                                                    WHERE documento ='${documento}') 
                        where id = ${id}`
        let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        res.status(200).json('Correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al remover el diagnóstico.' })
    }
}
const getAntecedenteNoPatologico = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            np.*,
                            np.comentario nombre
                        FROM  vesalio.antecedenteNOpatologico np
                        WHERE np.id =${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        res.status(200).json(rows)

    } catch (e) {
        res.status(400).json({
            error: 'error'
        })
    }
}
const insertAntecedenteNoPatologico = async (req, res) => {
    try {
        const { documento, comentario, persona } = req.body;


        var consulta = `INSERT INTO vesalio.antecedenteNOpatologico
                        (persona_id,personal_id,creadopor_id,comentario,creado_en,borrado_en) 
                        values
                        ((SELECT 
                            id 
                         FROM vesalio.persona p 
                         WHERE p.documento = '${persona}'),
                        (SELECT
                            pl.id
                         FROM vesalio.personal pl
                         INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                         WHERE documento ='${documento}'),
                        (SELECT 
                            u.id 
                         FROM vesalio.usuario u
                         INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                         INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                         WHERE documento ='${documento}'),
                         '${comentario}',
                        (SELECT now()),
                        (SELECT now())
                        )`
        let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        res.status(200).json('Correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el antecedente no patologico.' })
    }
}
const removeAntecedenteNoPatologico = async (req, res) => {
    try {
        const { documento, id } = req.body;
        var consulta = `update vesalio.antecedentenopatologico set eliminadopor_id = (SELECT 
                                                                                        u.id 
                                                                                    FROM vesalio.usuario u
                                                                                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                                                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                                                                    WHERE documento ='${documento}') 
                        where id = ${id}`
        let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        console.log(rows);
        res.status(200).json('Correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al remover el diagnóstico.' })
    }
}
const getAntecedenteMedicamento = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            ac.id,
                            CONCAT(a.nombre,' ',atp.dosis, ' ',tu.nombre,' ',tp.nombre) nombre,
                            ac.observacion
                        FROM  vesalio.articulocronico ac
                        inner join vesalio.viaadministracion va on va.id=ac.via_administracion_id
                        inner join vesalio.frecuencia f on f.id=ac.frecuencia_id
                        INNER JOIN vesalio.articulo_tipopresentacion atp ON atp.id=ac.articulotipopresentacion_id
                        INNER JOIN vesalio.tipopresentacion tp ON tp.id = atp.tipopresentacion_id
                        INNER JOIN vesalio.tipounidadmedida tu ON tu.id=atp.tipounidadmedida_id
                        INNER JOIN vesalio.articulo a ON a.id=atp.articulo_id
                        WHERE ac.id =${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        res.status(200).json(rows)

    } catch (e) {
        res.status(400).json({
            error: 'error'
        })
    }
}
const insertAntecedenteMedicamento = async (req, res) => {
    try {
        const { persona, documento, medicamento, viaAdministracion, frecuencia, dosis, cada, comentario } = req.body;

        let consultaExiste = `SELECT 
                                count(*)  cantidad
                              FROM  vesalio.articulocronico ac
                              inner join vesalio.persona p on ac.persona_id =p.id
                              where documento = '${documento}' and ac.borrado_logico = 0 and ac.articulotipopresentacion_id = '${medicamento}'`

        let [rowsExiste] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaExiste);
        if (parseInt(rowsExiste[0].cantidad) === 0) {
            var consulta = `insert into vesalio.articulocronico
                            (articulotipopresentacion_id,
                             persona_id,
                             via_administracion_id,
                             frecuencia_id,
                             cantidad,
                             frecuencia_cantidad,
                             observacion,
                             creado_en,
                             borrado_en,
                             creado_por_id,
                             borrado_logico)
                            values
                            (${medicamento},
                             (select id from vesalio.persona where documento = '${persona}'),
                             ${viaAdministracion},
                             ${frecuencia},
                             ${dosis},
                             ${cada},
                             '${comentario}',
                             (select now()),
                             (select now()),
                             (SELECT 
                                u.id 
                                FROM vesalio.usuario u
                                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                WHERE documento ='${documento}'),
                             0)`
            console.log(consulta);
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
            res.status(200).json('correcto')
        } else {
            res.status(200).json({ error: 'Ya existe un medicamento asignado con el mismo nombre' })
        }


    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el medicamento.' })
    }
}
const removeAntecedenteMedicamento = async (req, res) => {
    try {
        const { documento, id } = req.body;

        var consulta = `update vesalio.articulocronico set borrado_logico=1, eliminado_por_id = (SELECT 
                                                                                        u.id 
                                                                                    FROM vesalio.usuario u
                                                                                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                                                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                                                                    WHERE documento ='${documento}') 
                        where id = ${id}`
        let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        console.log(rows);
        res.status(200).json('Correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al remover el diagnóstico.' })
    }
}
const getAntecedenteHeredoFamiliar = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            d.*,
                            ac.id idPatologico,
                            ac.comentario
                        FROM  vesalio.antecedenteheredofamiliar ac
                        inner join vesalio.familiarol frol on frol.id=ac.familiarrol_id
                        INNER JOIN vesalio.diagnostico d ON ac.diagnostico_id = d.id
                        WHERE ac.id =${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        res.status(200).json(rows)

    } catch (e) {
        res.status(400).json({
            error: 'error'
        })
    }
}
const insertAntecedenteHeredoFamiliar = async (req, res) => {
    try {
        const { documento, comentario, diagnostico, persona, familiar } = req.body;

        let consultaExiste = `select 
                                count(*) cantidad
                               from vesalio.antecedenteheredofamiliar ap 
                               inner join vesalio.persona p  on p.id = ap.persona_id
                               where diagnostico_id = ${diagnostico} and p.documento ='${persona}' and eliminadopor_id is null and familiarrol_id = ${familiar}`

        let [rowsExiste] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaExiste);
        if (parseInt(rowsExiste[0].cantidad) === 0) {
            var consulta = `INSERT INTO vesalio.antecedenteheredofamiliar
                            (diagnostico_id,persona_id,personal_id,familiarrol_id,creadopor_id,comentario,creado_en,borrado_en)
                            values
                            (${diagnostico},
                            (SELECT 
                                id 
                             FROM vesalio.persona p 
                             WHERE p.documento = '${persona}'),
                            (SELECT
                                pl.id
                             FROM vesalio.personal pl
                             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                             WHERE documento ='${documento}'),
                            ${familiar},
                            (SELECT 
                                u.id 
                             FROM vesalio.usuario u
                             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                             WHERE documento ='${documento}'),
                            '${comentario}',
                            (SELECT now()),
                            (SELECT now()))`
            let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
            console.log(rows);
            res.status(200).json('correcto')
        } else {
            res.status(200).json({ error: 'No se puede ingresar el mismo diagnóstico.' })
        }


    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const removeAntecedenteHeredoFamiliar = async (req, res) => {
    try {
        const { documento, id } = req.body;
        var consulta = `update vesalio.antecedenteheredofamiliar set eliminadopor_id = (SELECT 
                                                                                            u.id 
                                                                                        FROM vesalio.usuario u
                                                                                        INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                                                                        INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                                                                        WHERE documento ='${documento}') 
                        where id = ${id}`
        let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        console.log(rows);
        res.status(200).json('Correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al remover el diagnóstico.' })
    }
}
const getAntecedenteQuirurgico = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            e.*,
                            ac.id idPatologico,
                            ac.fecha_cirugia,
                            ac.comentario
                        FROM  vesalio.antecedentequirurgico ac
                        INNER JOIN vesalio.estudio e ON ac.estudio_id=e.id
                        WHERE ac.id =${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        res.status(200).json(rows)

    } catch (e) {
        res.status(400).json({
            error: 'error'
        })
    }
}
const insertAntecedenteQuirurgico = async (req, res) => {
    try {
        const { documento, comentario, estudio, persona, fecha } = req.body;


        var consulta = `INSERT INTO vesalio.antecedentequirurgico
                        (estudio_id,persona_id,personal_id,creadopor_id,comentario,fecha_cirugia,creado_en,borrado_en)
                        values
                        (${estudio},
                        (SELECT 
                                id 
                             FROM vesalio.persona p 
                             WHERE p.documento = '${persona}'),

                        (SELECT
                                pl.id
                             FROM vesalio.personal pl
                             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                             WHERE documento ='${documento}'),
                        (SELECT 
                                u.id 
                             FROM vesalio.usuario u
                             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                             WHERE documento ='${documento}'),
                        '${comentario}',
                        '${fecha}',
                        (SELECT now()),
                        (SELECT now()))`
        let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        console.log(rows);
        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const removeAntecedenteQuirurgico = async (req, res) => {
    try {
        const { documento, id } = req.body;
        var consulta = `update vesalio.antecedentequirurgico set eliminadopor_id = (SELECT 
                                                                                        u.id 
                                                                                    FROM vesalio.usuario u
                                                                                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                                                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                                                                    WHERE documento ='${documento}') 
                        where id = ${id}`
        let rows = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        console.log(rows);
        res.status(200).json('Correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al remover el diagnóstico.' })
    }
}
const getConsultaBasica = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            if(tp.tipovezqueconsulta = 1,'1er Vez','Continuador') tipovezqueconsulta,
                            if(nb.medicion_ginecologia_id IS NULL,'NO','SI') mostrarGinecologica,
                            if(
                            m.tension_arterial_minima IS NULL AND 
                            m.tension_arterial_maxima IS NULL AND 
                            m.peso IS NULL AND 
                            m.talla IS NULL AND 
                            m.f_card IS NULL AND 
                            m.f_resp IS NULL AND 
                            m.temperatura IS NULL AND 
                            m.sato IS NULL AND 
                            m.hgt IS NULL,
                            'NO',
                            'SI'
                            ) mostrarMedidcion,
                            if(m.tension_arterial_minima is null,'',m.tension_arterial_minima) tension_arterial_minima,
                            if(m.tension_arterial_maxima is null,'',m.tension_arterial_maxima) tension_arterial_maxima,
                            if(m.peso is null,'',m.peso) peso,
                            if(m.talla is null,'',m.talla) talla,
                            if(m.temperatura is null,'',m.temperatura) temperatura,
                            if(m.f_card is null,'',m.f_card) f_card,
                            if(m.f_resp is null,'',m.f_resp) f_resp,
                            if(m.sato is null,'',m.sato) sato,  
                            if(m.hgt is null,'',m.hgt) hgt, 
                            if(cd.proxima_cita is null, 'N/A',cd.proxima_cita) proxima_cita,
                            nb.*	
                        from vesalio.consulta c 
                        INNER JOIN vesalio.consultadetalle cd ON cd.consulta_id = c.id
                        INNER JOIN vesalio.turno_programado tp ON tp.id = c.turno_id
                        INNER JOIN vesalio.notabasica nb ON nb.id =cd.id
                        left JOIN vesalio.medicion m ON m.id = nb.medicion_id
                        LEFT JOIN vesalio.consulta_medicion_ginecologia mg ON mg.id = nb.medicion_ginecologia_id
                        WHERE c.id = ${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        var consulta4 = `SELECT 
                            ac.id,
                            CONCAT(a.nombre,' ',atp.dosis, ' ',tu.nombre,' ',tp.nombre) nombre,
                            va.nombre via_administracion,
                            concat(cantidad, ' CADA ',ac.frecuencia_cantidad, ' ',f.nombre) cadaTiempo,
                            ac.observacion comentario,
                            cantidad_indicacion,
                            duracion_cantidad,
                            if(ac.unica_dosis is null,'-',ac.unica_dosis) unica_dosis,
                            is_new,
                            tprodfarma_id,
                            tprodfarma_text
                        FROM  vesalio.articuloprescripto ac
                        inner join vesalio.viaadministracion va on va.id=ac.via_administracion_id
                        inner join vesalio.frecuencia f on f.id=ac.frecuencia_id
                        INNER JOIN vesalio.articulo_tipopresentacion atp ON atp.id=ac.articulotipopresentacion_id
                        INNER JOIN vesalio.tipopresentacion tp ON tp.id = atp.tipopresentacion_id
                        INNER JOIN vesalio.tipounidadmedida tu ON tu.id=atp.tipounidadmedida_id
                        INNER JOIN vesalio.articulo a ON a.id=atp.articulo_id
                        WHERE ac.consulta_id = ${req.params.id}`
        const [rowsRectas] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);
        const tmp = []
        for await (var num of rowsRectas) {
            if (num.is_new === 1) {
                tmp.push({ ...num, nombre: num.tprodfarma_text })
            } else {
                tmp.push({ ...num })
            }

        }
        var consulta5 = `SELECT 
                            dd.*,
                            concat(d.nombre,' - ',d.codigocie10) nombreLista
                        from vesalio.diagnostico_detalle dd
                        INNER JOIN vesalio.diagnostico d ON dd.diagnostico_id = d.id
                        inner join vesalio.consultadetalle cd on cd.id=dd.detalle_id
                        WHERE 
                            -- orden = 1 and 
                            cd.consulta_id = ${req.params.id}`
        const [rowsDiagnostico] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta5);
        var consulta6 = `SELECT 
                            CONCAT(p.apellidos,' ',p.nombres) interviniente
                        FROM  vesalio.personalinterviniente pin
                        INNER JOIN vesalio.consultadetalle cd ON cd.id=pin.detalle_id
                        INNER JOIN vesalio.consulta c ON cd.consulta_id = c.id
                        INNER JOIN vesalio.personal pl ON pl.id = pin.personal_id
                        INNER JOIN vesalio.persona p ON p.id = pl.persona_id
                        WHERE c.id = ${req.params.id}`
        const [rowsInterviniente] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta6);
        var consulta7 = `select 
                            ec.observacion,
                            e.*
                        from vesalio.estudiocomplementario ec
                        inner join vesalio.estudio e on e.id=ec.estudio_id
                        where consulta_id = ${req.params.id}`
        const [rowsestudios] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta7);

        var consulta9 = `select 
                            ee.*,ec.* 
                        from vesalio.estudios_cabecera ec
                        left join vesalio.estudios_detalle d on ec.id = d.estudios_cabecera_id
                        left join vesalio.estudios_examenes ee on ee.id = d.estudio_examen_id
                        inner join vesalio.usuario u on u.id= ec.usuario_id
                        inner join vesalio.personal pl on pl.id=u.personal_id
                        inner join vesalio.persona p on p.id=pl.persona_id
                        where ec.persona_internacion_id = ${req.params.id}`
        const [rowsestudiosNew] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta9);


        res.status(200).json({
            datos: rows,
            recetas: tmp,
            diagnostico: rowsDiagnostico,
            interviniente: rowsInterviniente,
            estudios: rowsestudios,
            estudiosNew: rowsestudiosNew
        })

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const insertConsultaBasica = async (req, res) => {
    try {
        const { persona,
            estudios,
            recetas,
            diagnosticos,
            diagnosticoPrioridad,
            examenfisico,
            evoluciontto,
            motivo_consulta,
            antecedenteActual,
            tiempoEvolucion,
            documento,
            hospitalizacion,
            otros,
            tiempo,
            requiere,
            tto
        } = req.body;

        var consultaConsulta = `insert into vesalio.consulta
            (turno_id,fechahorainicio,created_at,created_by,personal_id )
            values(
            (select turno_id from vesalio.no_mostrar_internacion_emergencia where documento = '${persona}'),
            (SELECT now()),
            (SELECT now()),
            (SELECT 
                u.id 
             FROM vesalio.usuario u
             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
             WHERE documento ='${documento}'),
             (SELECT
                pl.id
             FROM vesalio.personal pl
             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
             WHERE documento ='${documento}'))`

        let rowsConsulta = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaConsulta);
        let consultaId = rowsConsulta[0].insertId

        var consultaConsultaDetalle = `insert into vesalio.consultadetalle
        (consulta_id,creado_en )
        values(
        ${consultaId},
        (SELECT now())
       )`
        let rowsConsultaDetalle = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaConsultaDetalle);
        let consultaIdDetalleId = rowsConsultaDetalle[0].insertId

        var consultaNobasica = `insert into vesalio.notabasica
        (id,examenfisico,evoluciontto,motivo_consulta, medicion_id, antecedenteActual,tiempoEvolucion )
        values(
            ${consultaIdDetalleId},
            '${examenfisico}',
            '${evoluciontto}',
            '${motivo_consulta}',
            (select medicion_id from vesalio.no_mostrar_internacion_emergencia where documento = '${persona}'),
            '${antecedenteActual}',
            '${tiempoEvolucion}'
        )`

        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaNobasica);

        var consulta2 = `INSERT INTO vesalio.eventohc 
        (tipocontenido_id,persona_id, fechahora,datos, lft, rgt, lvl, created_at,updated_at,creadopor_id) 
        values
        (
            1,
            (SELECT 
                id 
             FROM vesalio.persona p 
             WHERE p.documento = '${persona}'),
            (SELECT now()),
            '${consultaId}',
            1,
            2,
            0,  
            (SELECT now()),
            (SELECT now()) ,
            (SELECT 
                u.id 
             FROM vesalio.usuario u
             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
             WHERE documento ='${documento}')
        )`

        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`update vesalio.turno_programado set estado_turno_id = 5,consulta_id = ${consultaId} where id = (select turno_id from vesalio.no_mostrar_internacion_emergencia where documento = '${persona}')`);


        for await (var num of diagnosticos) {
            var diagnosticoConsultaDetalle = `insert into vesalio.diagnostico_detalle
            (diagnostico_id,detalle_id,orden,textodiagnostico,es_confirmado)
            values(
    
                ${num.id},
                ${consultaIdDetalleId},
                ${diagnosticoPrioridad.find(x => x === num.id) === undefined ? 2 : 1},
                '${num.label}',
                ${diagnosticoPrioridad.find(x => x === num.id) === undefined ? 0 : 1}
            )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(diagnosticoConsultaDetalle);

            var diagnosticoMopvimiento = `insert into vesalio.movimiento_internacion_diagnostico
            values(
                (select id from vesalio.internacion_movimiento where persona_internacion_id = (select persona_internacion_id from vesalio.no_mostrar_internacion_emergencia where documento = '${persona}')),
                ${num.id}
            )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(diagnosticoMopvimiento);


        }
        for await (var num of estudios) {
            var estudiocomplementario = `insert into vesalio.estudiocomplementario
                                        (estudio_id,consulta_id,observacion)
                                        values(
                                            ${num.id},
                                            ${consultaId},
                                            '${num.informacion}'
                                        )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(estudiocomplementario);
        }
        for await (var num of recetas) {
            var recetasConsulta = `insert into vesalio.articuloprescripto
                                        (  articulotipopresentacion_id,
                                            consulta_id,
                                            via_administracion_id, 
                                            cantidad,
                                            observacion,
                                            creado_en,   
                                            duracion_cantidad,
                                            frecuencia_cantidad,
                                            frecuencia_id,
                                            escronico,
                                            creado_por_id,  
                                            borrado_logico, 
                                            origen_atencion_id,
                                            cantidad_indicacion, 
                                            hora,
                                            unica_dosis,
                                            unidadMedida_id,
                                            is_new,
                                            tprodfarma_id )
                                        values(
                                            504,
                                            ${consultaId},
                                            ${num.viaAdministracion.id},
                                            ${parseFloat(num.dosis)},
                                            '${num.comentario}',
                                            (select now()),
                                            ${parseFloat(num.duracion)},
                                            ${parseFloat(num.frecuencia)},
                                            1,
                                            0,
                                            (SELECT 
                                                u.id 
                                             FROM vesalio.usuario u
                                             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                             WHERE documento ='${documento}'),
                                            0,
                                            1,
                                            ${parseFloat(num.cantidad)},
                                            '${num.fecha}',
                                            '${num.fecha}',
                                            ${num.unidadMedida.id},
                                            1,
                                            '${num.medicamento.label}'
                                        )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(recetasConsulta);
        }

        if (hospitalizacion) {


            var consulta3 = `INSERT INTO vesalio.internacion_orden 
            (   creado_por_id, 
                estado_orden_id,
                personal_id, 
                borrado_logico,
                observacion, 
                creado_en, 
                tiempo_hospi, 
                requiere_transfucion, 
                orden_medica_id, 
                tiempo_enfermedad, 
                signos_sintomas, 
                antecedentes_personales, 
                tratamiento,
                tratamiento_id,
                persona_id) 
            values
            ( 
                (SELECT 
                    u.id 
                FROM vesalio.usuario u
                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                WHERE documento ='${documento}'),
                1,
                (SELECT 
                    pl.id 
                FROM vesalio.personal  pl
                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                WHERE documento ='${documento}'),
                0,
                '${otros}',
                (select now()),
                ${tiempo},
                ${requiere},
                1,
                '${tiempoEvolucion}',
                '${motivo_consulta}',
                '${antecedenteActual}',
                '${evoluciontto}',
                ${tto},
                (SELECT 
                    id 
                 FROM vesalio.persona p 
                 WHERE p.documento = '${persona}')
            )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);
        }

        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`update vesalio.no_mostrar_internacion_emergencia set is_primera_vez = 0 where documento = '${persona}'`);

        res.status(200).json('correcto')


    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el estudio.' })
    }
}
const insertConsultaBasicaAmbulatoria = async (req, res) => {
    try {
        const {
            medicion,
            turno,
            persona,
            estudios,
            recetas,
            diagnosticos,
            diagnosticoPrioridad,
            examenfisico,
            evoluciontto,
            motivo_consulta,
            antecedenteActual,
            tiempoEvolucion,
            documento,
            hospitalizacion,
            otros,
            tiempo,
            requiere,
            tto
        } = req.body;

        console.log("estoy haya");
        var consultaMedicion = `insert into vesalio.medicion
        (persona_id, creadopor_id, modificadopor_id, tension_arterial_minima, tension_arterial_maxima,peso,talla,temperatura,creado_en, modificado_en, f_card,f_resp,sato,hgt) 
        values(
                (SELECT 
                    id 
                 FROM vesalio.persona p 
                 WHERE p.documento = '${persona}'),
                 (SELECT 
                    u.id 
                 FROM vesalio.usuario u
                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                 WHERE documento ='${documento}'),
                 (SELECT 
                    u.id 
                 FROM vesalio.usuario u
                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                 WHERE documento ='${documento}'),
                 ${parseFloat(medicion.tension_arterial_minima.length === 0 ? 0 : medicion.tension_arterial_minima)},
                 ${parseFloat(medicion.tension_arterial_maxima.length === 0 ? 0 : medicion.tension_arterial_maxima)},
                 ${parseFloat(medicion.peso.length === 0 ? 0 : medicion.peso)},
                 ${parseFloat(medicion.talla.length === 0 ? 0 : medicion.talla)},
                 ${parseFloat(medicion.temperatura.length === 0 ? 0 : medicion.temperatura)},  
                 (select now()),
                 (select now()),  
                 ${parseFloat(medicion.f_card.length === 0 ? 0 : medicion.f_card)},  
                 ${parseFloat(medicion.f_resp.length === 0 ? 0 : medicion.f_resp)},  
                 ${parseFloat(medicion.sato.length === 0 ? 0 : medicion.sato)},  
                 ${parseFloat(medicion.hgt.length === 0 ? 0 : medicion.hgt)})`
        let rowsAMedicion = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaMedicion);

        let medicionId = rowsAMedicion[0].insertId


        var consultaConsulta = `insert into vesalio.consulta
            (turno_id,fechahorainicio,created_at,created_by,personal_id )
            values(
            ${turno},
            (SELECT now()),
            (SELECT now()),
            (SELECT 
                u.id 
             FROM vesalio.usuario u
             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
             WHERE documento ='${documento}'),
             (SELECT
                pl.id
             FROM vesalio.personal pl
             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
             WHERE documento ='${documento}'))`

        let rowsConsulta = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaConsulta);
        let consultaId = rowsConsulta[0].insertId

        var consultaConsultaDetalle = `insert into vesalio.consultadetalle
        (consulta_id,creado_en )
        values(
        ${consultaId},
        (SELECT now())
       )`
        let rowsConsultaDetalle = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaConsultaDetalle);
        let consultaIdDetalleId = rowsConsultaDetalle[0].insertId

        var consultaNobasica = `insert into vesalio.notabasica
        (id,examenfisico,evoluciontto,motivo_consulta, medicion_id, antecedenteActual,tiempoEvolucion )
        values(
            ${consultaIdDetalleId},
            '${examenfisico}',
            '${evoluciontto}',
            '${motivo_consulta}',
            ${medicionId},
            '${antecedenteActual}',
            '${tiempoEvolucion}'
        )`

        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaNobasica);

        var consulta2 = `INSERT INTO vesalio.eventohc 
        (tipocontenido_id,persona_id, fechahora,datos, lft, rgt, lvl, created_at,updated_at,creadopor_id) 
        values
        (
            1,
            (SELECT 
                id 
             FROM vesalio.persona p 
             WHERE p.documento = '${persona}'),
            (SELECT now()),
            '${consultaId}',
            1,
            2,
            0,  
            (SELECT now()),
            (SELECT now()) ,
            (SELECT 
                u.id 
             FROM vesalio.usuario u
             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
             WHERE documento ='${documento}')
        )`

        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`update vesalio.turno_programado set tipovezqueconsulta= 1,estado_turno_id = 5,consulta_id = ${consultaId} where id = ${turno}`);


        for await (var num of diagnosticos) {
            var diagnosticoConsultaDetalle = `insert into vesalio.diagnostico_detalle
            (diagnostico_id,detalle_id,orden,textodiagnostico,es_confirmado)
            values(
    
                ${num.id},
                ${consultaIdDetalleId},
                ${diagnosticoPrioridad.find(x => x === num.id) === undefined ? 2 : 1},
                '${num.label}',
                ${diagnosticoPrioridad.find(x => x === num.id) === undefined ? 0 : 1}
            )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(diagnosticoConsultaDetalle);
        }
        for await (var num of estudios) {
            /*
            var estudiocomplementario = `insert into vesalio.estudiocomplementario
                                        (estudio_id,consulta_id,observacion)
                                        values(
                                            ${num.id},
                                            ${consultaId},
                                            '${num.informacion}'
                                        )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(estudiocomplementario);
            */
            var estudiocomplementario = `insert into vesalio.estudios_cabecera
            (usuario_id,persona_internacion_id,informacion,impresion,tipo)
            values(
                (SELECT 
                    u.id 
                 FROM vesalio.usuario u
                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                 WHERE documento ='${documento}'),
                ${consultaId},
                '${num.informacion}',
                '${num.impresion}',
                'AMBULATORIO'
            )`
            let idInsercion = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(estudiocomplementario);
            let idEstudioCabecera = idInsercion[0].insertId;

            for await (var numx of num.componentes) {
                var estudiocomplementario = `insert into vesalio.estudios_detalle
                (estudios_cabecera_id,estudio_examen_id)
                values(
                    ${idEstudioCabecera},
                    ${numx.id}
                )`
                await conexion.find(x => x.nombre === 'servidor_copia').connect.query(estudiocomplementario);
            }

        }
        for await (var num of recetas) {
            // el articulo 434 sera el atp por defecto para que no interrumpa en la accion
            var recetasConsulta = `insert into vesalio.articuloprescripto
                                        (  articulotipopresentacion_id,
                                            consulta_id,
                                            via_administracion_id, 
                                            cantidad,
                                            observacion,
                                            creado_en,   
                                            duracion_cantidad,
                                            frecuencia_cantidad,
                                            frecuencia_id,
                                            escronico,
                                            creado_por_id,  
                                            borrado_logico, 
                                            origen_atencion_id,
                                            cantidad_indicacion, 
                                            hora,
                                            unica_dosis,
                                            unidadMedida_id,
                                            is_new,
                                            tprodfarma_id,
                                            tprodfarma_text
                                            )
                                        values(
                                            504,
                                            ${consultaId},
                                            ${num.viaAdministracion.id},
                                            ${parseFloat(num.dosis)},
                                            '${num.comentario}',
                                            (select now()),
                                            ${parseFloat(num.duracion)},
                                            ${parseFloat(num.frecuencia)},
                                            1,
                                            0,
                                            (SELECT 
                                                u.id 
                                             FROM vesalio.usuario u
                                             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                             WHERE documento ='${documento}'),
                                            0,
                                            1,
                                            ${parseFloat(num.cantidad)},
                                            '${num.fecha}',
                                            '${num.fecha}',
                                            ${num.unidadMedida.id},
                                            1,
                                            '${num.medicamento.id}',
                                            '${num.medicamento.label}'
                                        )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(recetasConsulta);
        }
        if (hospitalizacion) {

            var consulta5 = `insert into vesalio.internacion_persona 
            (persona_id,borrado_logico,creado_en,modificado_en) 
            values(
                    (SELECT 
                        id 
                     FROM vesalio.persona p 
                     WHERE p.documento = '${persona}'),
                    0,  
                    (select now()),
                    (select now())   
            )`
            let rowsInternacion = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta5);
            let internacionId = rowsInternacion[0].insertId


            var consulta2 = `INSERT INTO vesalio.eventohc 
                            (tipocontenido_id,persona_id, fechahora,datos, lft, rgt, lvl, created_at,updated_at,creadopor_id) 
                            values
                            (
                                14,
                                (SELECT 
                                    id 
                                FROM vesalio.persona p 
                                WHERE p.documento = '${persona}'),
                                (SELECT now()),
                                '${internacionId}',
                                1,
                                2,
                                0,  
                                (SELECT now()),
                                (SELECT now()) ,
                                (SELECT 
                                    u.id 
                                FROM vesalio.usuario u
                                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                WHERE documento ='${documento}')
                            )`

            var eventos = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`update vesalio.internacion_persona set evento_id = ${eventos[0].insertId} where id = ${internacionId}`);

            var consulta3 = `INSERT INTO vesalio.internacion_orden 
            (   creado_por_id, 
                estado_orden_id,
                personal_id, 
                borrado_logico,
                observacion, 
                creado_en, 
                tiempo_hospi, 
                requiere_transfucion, 
                orden_medica_id, 
                tiempo_enfermedad, 
                signos_sintomas, 
                antecedentes_personales, 
                tratamiento,
                tratamiento_id,
                persona_id) 
            values
            ( 
                (SELECT 
                    u.id 
                FROM vesalio.usuario u
                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                WHERE documento ='${documento}'),
                1,
                (SELECT 
                    pl.id 
                FROM vesalio.personal  pl
                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                WHERE documento ='${documento}'),
                0,
                '${otros}',
                (select now()),
                ${tiempo},
                ${requiere},
                1,
                '${tiempoEvolucion}',
                '${motivo_consulta}',
                '${antecedenteActual}',
                '${evoluciontto}',
                ${tto},
                (SELECT 
                    id 
                 FROM vesalio.persona p 
                 WHERE p.documento = '${persona}')
            )`

            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`insert into vesalio.no_mostrar_internacion_emergencia values('${persona}',${medicionId},${turno},${internacionId},0)`);
        }

        res.status(200).json('correcto')


    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el estudio.' })
    }
}
const getConsultaBasicaGinecologia = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            DATE_FORMAT(mg.fecha_ultima_menstruacion, "%e/%c/%Y")  fecha_ultima_menstruacion,
                            if(mg.ciclo = 1,'Regular','Irregular') ciclo,
                            concat(mg.dias_sangrado,' x ',mg.dias_ciclo) ritmoMenstural,
                            mg.edad_iniciacion_sexual,
                            mg.partos,
                            concat(mg.gestacion,' semanas') gestacion,
                            DATE_FORMAT(mg.fecha_probable_parto, "%e/%c/%Y") fecha_probable_parto ,
                            mg.abortos,
                            mg.pap,
                            if(mg.fuma = 2,'No','Si') fuma,
                            mac.nombre metodo,
                            th.nombre tratamiento	
                        from vesalio.consulta c 
                        INNER JOIN vesalio.consultadetalle cd ON cd.consulta_id = c.id
                        INNER JOIN vesalio.turno_programado tp ON tp.id = c.turno_id
                        INNER JOIN vesalio.notabasica nb ON nb.id =cd.id
                        INNER JOIN vesalio.medicion m ON m.id = nb.medicion_id
                        LEFT JOIN vesalio.consulta_medicion_ginecologia mg ON mg.id = nb.medicion_ginecologia_id
                        INNER JOIN vesalio.admin_metodo_anticonceptivo mac ON mac.id = mg.metodo_anticonceptivo_id
                        INNER JOIN vesalio.admin_tratamiento_hormonal th ON th.id = mg.tratamiento_hormonal_id
                        WHERE c.id = ${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        res.status(200).json({
            datos: rows
        })

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getInformacionAdicional = async (req, res) => {
    try {
        var consulta3 = `SELECT * FROM vesalio.hc_informacion_adicional
                         WHERE id = ${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        res.status(200).json(rows)

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getOrdenesHospitalizacion = async (req, res) => {
    try {
        var consulta3 = `select
                            om.nombre,
                            io_.observacion,
                            DATE_FORMAT(io_.creado_en, "%e/%c/%Y %H:%i") fechahora,
                            concat(apellidos,' ',nombres) paciente,
                            p.id idepersona,
                            p.documento,
                            io_.id
                        from vesalio.internacion_orden io_
                        left join vesalio.internacion_orden_medica om on om.id = io_.orden_medica_id 
                        left join vesalio.persona p on p.id = io_.persona_id
                        where estado_orden_id = 1
                        order by io_.id desc`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        res.status(200).json(rows)

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const insertCamaHospitalizacion = async (req, res) => {
    try {
        const {
            persona,
            cama,
            orden

        } = req.body;
        console.log(req.body);

        let [personaInternacion] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`select * from vesalio.no_mostrar_internacion_emergencia where documento = '${persona}'`);
        let [movimientoAnterior] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`select * from vesalio.internacion_movimiento where persona_internacion_id = (select persona_internacion_id from vesalio.no_mostrar_internacion_emergencia where documento = '${persona}' limit 1) order by id desc`);

        var consulta6 = `insert into vesalio.internacion_movimiento 
        (persona_internacion_id,cama_id,tipo_evento_id,origen_id,destino_id,orden_internacion_id,fecha_hora_evento,borrado_logico,creado_en) 
        values(
               ${personaInternacion[0].persona_internacion_id},
               ${cama},  
               2,
               34,
               17,
               ${orden},
               (select now()),
               0,
               (select now())
        )`
        let insertMovimiento = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta6);
        if (movimientoAnterior.length > 0) {
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`update vesalio.internacion_movimiento set siguiente_evento_id = ${insertMovimiento[0].insertId} where id = ${movimientoAnterior[0].id}`);
        }
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(`update vesalio.internacion_orden set estado_orden_id = 2 where id = ${orden} `);


        res.status(200).json('correcto')


    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al momento de asignar una cama.' })
    }
}
const insertInformacionAdicional = async (req, res) => {
    try {
        const { documento, comentario, persona } = req.body;
        console.log(req.body)

        var consulta = `INSERT INTO vesalio.hc_informacion_adicional 
                        (persona_id,creadopor_id,creado_en,informacion_adicional,no_imprimir) 
                        values
                        ((SELECT 
                                id 
                             FROM vesalio.persona p 
                             WHERE p.documento = '${persona}'),
                        (SELECT 
                                u.id 
                             FROM vesalio.usuario u
                             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                             WHERE documento ='${documento}'),
                        (SELECT now()),
                        '${comentario}',
                        0)`
        let rowsInformacion = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        // segunda parte
        let informacionId = rowsInformacion[0].insertId

        var consulta2 = `INSERT INTO vesalio.eventohc 
                        (tipocontenido_id,persona_id, fechahora,datos, lft, rgt, lvl, created_at,updated_at,creadopor_id) 
                        values
                        (
                            8,
                            (SELECT 
                                id 
                             FROM vesalio.persona p 
                             WHERE p.documento = '${persona}'),
                            (SELECT now()),
                            '${informacionId}',
                            1,
                            2,
                            0,  
                            (SELECT now()),
                            (SELECT now()) ,
                            (SELECT 
                                u.id 
                             FROM vesalio.usuario u
                             INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                             INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                             WHERE documento ='${documento}')
                        )`
        let rowsEvento = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);
        let eventoId = rowsEvento[0].insertId
        var consultaFinal = `update vesalio.hc_informacion_adicional set evento_id = ${eventoId} where id =  ${informacionId}`
        let update = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaFinal);
        console.log(update);
        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const insertIndicaciones = async (req, res) => {
    try {
        const { planHidratacion, personaInternacion, documento, dieta, consistencia, movilidad, oxigeno, nebulizacion, kinesioterapia, alergiasText, precaucionesText, alimentacionText, textOxigenoterapia } = req.body;
        let movilidadId = null
        if (movilidad.length !== 0) {
            var consulta = `INSERT INTO vesalio.internacion_movilidad 
            (creado_por_id,descripcion,creado_en,borrado_logico) 
            values
            (
                (SELECT 
                    u.id 
                 FROM vesalio.usuario u
                 INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                 INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                 WHERE documento ='${documento}'),
                '${movilidad}',
                (SELECT now()),
                0
            )`
            let rowsMovi = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
            movilidadId = rowsMovi[0].insertId
        }
        var consulta = `INSERT INTO vesalio.internacion_hoja_indicaciones 
                        (personal_id,persona_internacion_id,dieta_id,consistencia_id,movilidad_id,oxigenoterapia_id,periodicidad_nebulizaciones_id,kinesioterapia_id,
                            creado_por_id,fecha,indicaciones,creado_en,borrado_logico,alergias,precauciones,alimentacion,textOxigenoterapia) 
                        values
                        (   (SELECT 
                                pl.id 
                            FROM vesalio.personal  pl
                            INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                            WHERE documento ='${documento}'),
                            ${personaInternacion},
                            ${dieta},
                            ${consistencia},
                            ${movilidadId},
                            ${oxigeno},
                            ${nebulizacion},
                            ${kinesioterapia},
                            (SELECT 
                                    u.id 
                                FROM vesalio.usuario u
                                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                WHERE documento ='${documento}'),

                            (SELECT now()),
                            'Control de Signos vitales, Balance hídrico por turno',
                            (SELECT now()),
                            0,
                            '${alergiasText}',
                            '${precaucionesText}',
                            '${alimentacionText}',
                            '${textOxigenoterapia}'
                        )`
        let insertHoja = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        for await (var num of planHidratacion) {
            var consultaNew = `INSERT INTO vesalio.internacion_indaciones_plan_hidratacion 
                            (persona_internacion_id,
                             solucion, 
                             cantidadSolucion, 
                             medicamentos, 
                             observacion, 
                             hoja_indicaciones_id) 
                        values
                        (   
                            ${personaInternacion},
                            '${num.solucion.label}',
                            ${num.cantidad},
                            '${num.medicamento}',
                            '${num.comentario}',
                            ${insertHoja[0].insertId}
                        )`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaNew);
        }

        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const getIndicacionesView = async (req, res) => {

    try {
        var personInternacion = req.params.id

        let consulta = `select 
                            hi.*,
                            if(d.descripcion is null,'',d.descripcion) dieta_nombre,
                            if(c.descripcion is null,'',c.descripcion) consistencia_nombre,
                            if(m.descripcion is null,'',m.descripcion) movilidad_nombre,
                            if(o.descripcion is null,'',o.descripcion) oxigenoterapia_nombre,
                            if(pn.descripcion is null,'',pn.descripcion) periodicidad_nebulizaciones_nombre,
                            if(k.descripcion is null,'',k.descripcion) kinesioterapia_nombre,
                            DATE_FORMAT(hi.fecha, "%e/%c/%Y %H:%i") fechahora,
                            CONCAT(apellidos,' ',nombres) persona_crea,
                            (SELECT nombre FROM vesalio.especialidad where id = (SELECT especialidad_id FROM vesalio.asignacion WHERE personal_id = pl.id LIMIT 1 )) nombre_especialidad
                        from vesalio.internacion_hoja_indicaciones hi 
                        left join vesalio.internacion_dieta d on d.id = hi.dieta_id
                        left join vesalio.internacion_consistencia c on c.id = hi.consistencia_id
                        left join vesalio.internacion_movilidad m on m.id = hi.movilidad_id
                        left join vesalio.internacion_oxigenoterapia o on o.id = hi.oxigenoterapia_id
                        left join vesalio.internacion_periodicidad_nebulizaciones pn on pn.id = hi.periodicidad_nebulizaciones_id
                        left join vesalio.internacion_kinesioterapia k on k.id = hi.kinesioterapia_id
                        inner join vesalio.usuario u on u.id = hi.creado_por_id
                        inner join vesalio.personal pl on pl.id = u.personal_id
                        inner join vesalio.persona p on p.id=pl.persona_id
                        where persona_internacion_id = ${personInternacion}`
        let [rowsView] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);


        res.status(200).json({
            view: rowsView,
        })



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const getIndicacionesViewExtras = async (req, res) => {

    try {
        var personInternacion = req.params.id

        let consulta = `select * from vesalio.internacion_indaciones_plan_hidratacion where persona_internacion_id =  ${personInternacion}`
        let [rowsView] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);


        res.status(200).json({
            planHidratacion: rowsView,
        })



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const getIndicacionesEnfermeriaView = async (req, res) => {
    try {
        var personInternacion = req.params.id

        let consulta = `select 
                            hi.*,tm.codigo,concat(apellidos,' ',nombres) informadoPor,DATE_FORMAT(hi.fecha, "%e/%c/%Y %H:%i") fechahora
                        from vesalio.internacion_hoja_enfermeria_indicacion hi
                        inner join vesalio.internacion_tipo_medicacion tm on tm.id = hi.tipo_id
                        inner join vesalio.usuario u on u.id = hi.creado_por_id
                        inner join vesalio.personal pl on pl.id = u.personal_id
                        inner join vesalio.persona p on p.id = pl.persona_id
                        where persona_internacion_id =  ${personInternacion} and activo = 1
                        order by hi.fecha desc`

        let [rowsView] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        res.status(200).json({
            view: rowsView
        })



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const insertIndicacionesEnfermeria = async (req, res) => {
    try {
        const { tipo, nota, personaInternacion, documento } = req.body;

        var consulta = `INSERT INTO vesalio.internacion_hoja_enfermeria_indicacion 
                        (creado_por_id,persona_internacion_id,tipo_id, nota, fecha, creado_en, activo) 
                        values
                        (   
                            (SELECT 
                                    u.id 
                                FROM vesalio.usuario u
                                INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                WHERE documento ='${documento}'),
                            ${personaInternacion},
                            (
                                select 
                                    id
                                from vesalio.internacion_tipo_medicacion
                                where codigo = '${tipo}'
                            ),
                            '${nota}',
                            (SELECT now()),
                            (SELECT now()),
                            1
                           
                        )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);



        res.status(200).json('correcto')



    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const updateInformacionAdicional = async (req, res) => {
    try {
        const { comentario, id, documento, compara } = req.body;

        var consulta = `SELECT 
                            u.id 
                        FROM vesalio.usuario u
                        INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                        INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                        WHERE documento ='${documento}'`
        let [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        if (parseInt(rows[0].id) === parseInt(compara)) {
            var consultaFinal = `update vesalio.hc_informacion_adicional set informacion_adicional = '${comentario}' where id =  ${id}`
            await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaFinal);
            res.status(200).json('correcto')
        } else {
            res.status(200).json({ error: 'Ocurrio un error al actualizar.' })
        }

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el diagnóstico.' })
    }
}
const getConsultaOftalomologia = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            o.*,
                            if(o.auto_ref_od_rec = 0 , 'NO','SI') auto_ref_od_rec_,
                            if(o.auto_ref_oi_rec = 0 , 'NO','SI') auto_ref_oi_rec_,
                            if(o.l_od_rec = 0 , 'NO','SI') l_od_rec_,
                            if(o.l_oi_rec = 0 , 'NO','SI') l_oi_rec_,
                            if(o.c_od_rec = 0 , 'NO','SI') c_od_rec_,
                            if(o.c_oi_rec = 0 , 'NO','SI') c_oi_rec_,
                            if(o.add_od_rec = 0 , 'NO','SI') add_od_rec_,
                            if(o.add_oi_rec = 0 , 'NO','SI') add_oi_rec_,
                            if(o.md_od_rec = 0 , 'NO','SI') md_od_rec_,
                            if(o.md_oi_rec = 0 , 'NO','SI') c_oi_rec_,
                            if(o.gafas_od_rec = 0 , 'NO','SI') gafas_od_rec_,
                            if(o.gafas_oi_rec = 0 , 'NO','SI') gafas_oi_rec_,
                            if(o.ref_ciclo_od_rec = 0 , 'NO','SI') gafas_od_rec_,
                            if(o.ref_ciclo_oi_rec = 0 , 'NO','SI') ref_ciclo_oi_rec_,
                            if(o.lentes_contacto_od_rec = 0 , 'NO','SI') lentes_contacto_od_rec_,
                            if(o.lentes_contacto_oi_rec = 0 , 'NO','SI') lentes_contacto_oi_rec_,
                            if(tp.tipovezqueconsulta = 1,'1er Vez','Ulterior') tipovezqueconsulta,
                            if(
                                m.tension_arterial_minima IS NULL AND 
                                m.tension_arterial_maxima IS NULL AND 
                                m.peso IS NULL AND 
                                m.talla IS NULL AND 
                                m.f_card IS NULL AND 
                                m.f_resp IS NULL AND 
                                m.temperatura IS NULL AND 
                                m.sato IS NULL AND 
                                m.hgt IS NULL,
                                'NO',
                                'SI'
                                ) mostrarMedidcion,
                            if(m.tension_arterial_minima is null,'',m.tension_arterial_minima) tension_arterial_minima,
                            if(m.tension_arterial_maxima is null,'',m.tension_arterial_maxima) tension_arterial_maxima,
                            if(m.peso is null,'',m.peso) peso,
                            if(m.talla is null,'',m.talla) talla,
                            if(m.temperatura is null,'',m.temperatura) temperatura,
                            if(m.f_card is null,'',m.f_card) f_card,
                            if(m.f_resp is null,'',m.f_resp) f_resp,
                            if(m.sato is null,'',m.sato) sato,  
                            if(m.hgt is null,'',m.hgt) hgt, 
                            if(cd.proxima_cita is null, 'N/A',cd.proxima_cita) proxima_cita
                        FROM vesalio.oftalmologia o
                        INNER JOIN vesalio.medicion m ON m.id = o.medicion_id
                        INNER JOIN vesalio.consultadetalle cd ON cd.id= o.id
                        INNER JOIN vesalio.consulta c ON c.id = cd.consulta_id
                        INNER JOIN vesalio.turno_programado tp ON tp.id = c.turno_id
                        WHERE c.id = ${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);
        var consulta4 = `SELECT 
                            ac.id,
                            CONCAT(a.nombre,' ',atp.dosis, ' ',tu.nombre,' ',tp.nombre) nombre,
                            va.nombre via_administracion,
                            concat(cantidad, ' CADA ',ac.frecuencia_cantidad, ' ',f.nombre) cadaTiempo,
                            ac.observacion comentario
                        FROM  vesalio.articuloprescripto ac
                        inner join vesalio.viaadministracion va on va.id=ac.via_administracion_id
                        inner join vesalio.frecuencia f on f.id=ac.frecuencia_id
                        INNER JOIN vesalio.articulo_tipopresentacion atp ON atp.id=ac.articulotipopresentacion_id
                        INNER JOIN vesalio.tipopresentacion tp ON tp.id = atp.tipopresentacion_id
                        INNER JOIN vesalio.tipounidadmedida tu ON tu.id=atp.tipounidadmedida_id
                        INNER JOIN vesalio.articulo a ON a.id=atp.articulo_id
                        WHERE ac.consulta_id = ${req.params.id}`
        const [rowsRectas] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);
        var consulta5 = `SELECT 
                            dd.*,
                            concat(d.nombre,' - ',d.codigocie10) nombreLista
                        from vesalio.diagnostico_detalle dd
                        INNER JOIN vesalio.diagnostico d ON dd.diagnostico_id = d.id
                        inner join vesalio.consultadetalle cd on cd.id=dd.detalle_id
                        WHERE orden = 1 and cd.consulta_id = ${req.params.id}`
        const [rowsDiagnostico] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta5);

        console.log(rows);
        res.status(200).json({
            datos: rows,
            diagnostico: rowsDiagnostico,
            recetas: rowsRectas,
        })

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getConsultaOftalomologiaDetalle = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            *
                        FROM vesalio.oftalmologia_queratrometia 
                        WHERE oftalmologia_id = ${req.params.id}`
        const [rowsQueratrometia] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);
        var consulta4 = `SELECT 
                            *
                        FROM vesalio.oftalmologia_balance_muscular 
                        WHERE oftalmologia_id = ${req.params.id}`
        const [rowsBalance] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);
        res.status(200).json({
            queratrometia: rowsQueratrometia,
            balanceMuscular: rowsBalance
        })

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getEnfermeria = async (req, res) => {
    try {
        var consulta3 = `SELECT 
                            e.*,
                            if(tp.tipovezqueconsulta = 1,'1er Vez','Ulterior') tipovezqueconsulta,
                            CASE 
                                when criterio_turno = 1 then 'Emergencia tipo I'
                                when criterio_turno = 2 then 'Emergencia tipo II'
                                when criterio_turno = 3 then 'Urgencia tipo III'
                                when criterio_turno = 4 then 'Urgencia tipo IV'
                            END criterioTurno,
                            if(
                                m.tension_arterial_minima IS NULL AND 
                                m.tension_arterial_maxima IS NULL AND 
                                m.peso IS NULL AND 
                                m.talla IS NULL AND 
                                m.f_card IS NULL AND 
                                m.f_resp IS NULL AND 
                                m.temperatura IS NULL AND 
                                m.sato IS NULL AND 
                                m.hgt IS NULL,
                                'NO',
                                'SI'
                                ) mostrarMedidcion,
                                if(m.tension_arterial_minima is null,'',m.tension_arterial_minima) tension_arterial_minima,
                                if(m.tension_arterial_maxima is null,'',m.tension_arterial_maxima) tension_arterial_maxima,
                                if(m.peso is null,'',m.peso) peso,
                                if(m.talla is null,'',m.talla) talla,
                                if(m.temperatura is null,'',m.temperatura) temperatura,
                                if(m.f_card is null,'',m.f_card) f_card,
                                if(m.f_resp is null,'',m.f_resp) f_resp,
                                if(m.sato is null,'',m.sato) sato,  
                                if(m.hgt is null,'',m.hgt) hgt ,
                                -- if(e.especialidad_turno is null, '',(select nombre from vesalio.especialidad where codigo_db COLLATE UTF8_SPANISH_CI= e.especialidad_turno COLLATE UTF8_SPANISH_CI)) especialidadNombre     
                                (select nombre from vesalio.especialidad where id = e.especialidad_turno) especialidadNombre
                        
                        
                        FROM vesalio.enfermeria e 
                        INNER JOIN vesalio.consultadetalle cd ON cd.id = e.id
                        INNER JOIN vesalio.consulta c ON c.id = cd.consulta_id
                        INNER JOIN vesalio.medicion m ON m.id = e.medicion_id
                        inner JOIN vesalio.turno_programado tp ON tp.consulta_id = c.id
                        
                        WHERE c.id =  ${req.params.id}`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);
        var consulta4 = `SELECT 
                            pe.nombre,pe.id	
                         FROM vesalio.enfermeria_prestacion_enfermeria pef
                         INNER JOIN vesalio.prestacion_enfermeria pe	ON pef.prestacion_enfermeria_id = pe.id
                         INNER JOIN vesalio.enfermeria e ON e.id = pef.enfermeria_id
                         INNER JOIN vesalio.consultadetalle cd ON cd.id = e.id
                         INNER JOIN vesalio.consulta c ON c.id = cd.consulta_id
                         WHERE c.id =  ${req.params.id}`
        const [rowsPrestaciones] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);


        res.status(200).json({
            datos: rows,
            prestaciones: rowsPrestaciones
        })

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getHabitacion = async (_, res) => {
    try {
        var consulta3 = `SELECT 
                            ISl.id codigoSala,
                            ISl.nombre nombreSala,
                            h.id codigoHabitacion,
                            h.nombre nombreHabitacion,
                            c.id camaId,
                            c.nombre nombreCama
                        FROM vesalio.internacion_cama c 
                        INNER JOIN vesalio.internacion_habitacion h ON c.habitacion_id =  h.id
                        INNER JOIN  vesalio.internacion_sala ISl ON ISl.id = h.sala_id 
                        WHERE ISl.borrado_por_id IS NULL AND 
                            h.borrado_por_id IS NULL AND 
                                c.borrado_por_id IS NULL `
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        var consulta4 = `SELECT 
                            c.id,
                            m.persona_internacion_id
                        from vesalio.internacion_movimiento m
                        INNER JOIN vesalio.internacion_cama c ON c.id = m.cama_id
                        INNER JOIN vesalio.internacion_habitacion ih ON c.habitacion_id = ih.id
                        INNER JOIN vesalio.internacion_sala i_s ON i_s.id=ih.sala_id
                        where persona_internacion_id not in (SELECT 
                                                                persona_internacion_id 
                                                            from vesalio.internacion_movimiento mg
                                                            where mg.tipo_evento_id in (5,11)
                                                            ) AND 
                              siguiente_evento_id IS NULL 
                        GROUP BY cama_id
                        ORDER BY i_s.nombre,ih.nombre,c.nombre`

        const [rowsOcupados] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);
        let tmp = []
        for await (var num of rowsOcupados) {
            var estudiocomplementario = `select 
                                            concat(apellidos,' ' ,nombres) nombres,
                                            documento
                                        from vesalio.internacion_persona ip 
                                        inner join vesalio.persona p on p.id = ip.persona_id
                                        where ip.id= ${num.persona_internacion_id}`

            let [rptaRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(estudiocomplementario);

            const result = await sql.query(`select * from BDSistComp.dbo.historias where Nro_DocIdenti='${rptaRows[0].documento}'`)
            tmp.push({ ...num, titulo: rptaRows[0].nombres, documento: rptaRows[0].documento, historia: result.recordset.length === 0 ? 'Sin Historia' : result.recordset[0].Nro_Historia })
        }

        const resultLibre = await sql.query(`select h.Nro_Habitacion, h.enlace1,
                                                case when h.Est_Habitacion in ('', 'O') and h.Nro_Historia in ('', '0000000') then 0 else 1 end as estado
                                            from [dbo].[THabitaciones] h
                                            where h.Est_Habitacion in ('', 'O') and h.Nro_Historia in ('', '0000000') and h.enlace1 is not null;`)


        res.status(200).json({
            datos: rows,
            ocupados: tmp,
            libreSistComp: resultLibre.recordset
        })

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'error'
        })
    }
}
const getCamaPaciente = async (req, res) => {
    var id = req.params.id
    var consulta = `SELECT 
                        m.*,
                        p.documento
                    FROM vesalio.internacion_movimiento m
                    INNER JOIN  vesalio.internacion_persona pi_  ON pi_.id =m.persona_internacion_id
                    INNER JOIN vesalio.persona p ON pi_.persona_id = p.id
                    WHERE persona_internacion_id = ${id} AND m.siguiente_evento_id IS null`

    const [documentoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
    if (documentoRows.length > 0) {
        let numero = documentoRows[0].documento
        const result = await sql.query(`select * from BDSistComp.dbo.historias where Nro_DocIdenti='${numero}'`)

        var consulta = `SELECT 
                            i_s.descripcion origen,
                            i_s1.descripcion destino,
                            DATE_FORMAT(m.fecha_hora_evento, "%Y-%c-%eT%H:%i") fechahora ,
                            m.*
                        FROM vesalio.internacion_movimiento m
                        left JOIN vesalio.internacion_servicio i_s ON i_s.id =m.origen_id
                        left JOIN vesalio.internacion_servicio i_s1 ON i_s1.id =m.destino_id
                        WHERE persona_internacion_id = ${id} 
                        ORDER BY m.id`

        var consultaMedicoTratate = `SELECT * FROM vesalio.internacion_persona WHERE id = ${id}`
        const [medicoTratate] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaMedicoTratate);

        const [listaOrigenes] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        var consulta2 = `SELECT
                            *
                        FROM vesalio.turno_programado 
                        WHERE persona_id = (SELECT persona_id FROM vesalio.internacion_persona WHERE id = ${id} )
                        ORDER  BY id DESC`

        const [turnosProgramados] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);


        res.status(200).json({
            datos: result.recordset,
            medicoTratate: medicoTratate[0],
            datosInternacion: documentoRows,
            listaOrigenes: listaOrigenes,
            turnosProgramado: turnosProgramados[0].id
        })
    } else {
        res.status(200).json({
            error: 'Ocurrio un error'
        })
    }

}
const getDiagnosticosInternacion = async (req, res) => {

    try {
        var id = req.params.id
        var consulta = `SELECT 
                            d.* ,
                            concat(d.nombre,' - ',d.codigocie10) nombreLista
                        FROM vesalio.movimiento_internacion_diagnostico idm
                        inner join vesalio.internacion_movimiento im ON idm.ocupacion_id = im.id
                        INNER JOIN vesalio.diagnostico d ON d.id=idm.diagnostico_id
                        WHERE persona_internacion_id = ${id} 
                        GROUP BY d.nombre`

        const [diagnosticosRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        res.status(200).json({
            datos: diagnosticosRows,
        })
    } catch (e) {
        res.status(200).json({
            error: 'Ocurrio un error'
        })
    }
}
const getHojaEvolcuion = async (req, res) => {

    try {
        var id = req.params.id
        var consulta = `SELECT 
                            ihe.persona_internacion_id,
                            ed.*,
                            DATE_FORMAT(ed.creado_en, "%e/%c/%Y %H:%i") fechahora ,
                            CONCAT(apellidos,' ',nombres) persona_crea,
                            (SELECT nombre FROM vesalio.especialidad where id = (SELECT especialidad_id FROM vesalio.asignacion WHERE personal_id = pl.id LIMIT 1 )) nombre_especialidad
                        FROM vesalio.internacion_hoja_evolucion ihe
                        INNER JOIN vesalio.evolucion_descripcion ed ON ed.hoja_evolucion_id = ihe.id
                        INNER JOIN vesalio.usuario u ON ed.creado_por_id = u.id
                        INNER JOIN vesalio.personal pl ON pl.id = u.personal_id
                        INNER JOIN vesalio.persona p ON p.id = pl.persona_id
                        WHERE persona_internacion_id = ${id}
                        ORDER BY ed.id desc`

        const [evolucionRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        var consultaaaa = `SELECT 
                            documento
                        FROM vesalio.internacion_persona ihe
                        INNER JOIN vesalio.persona p ON p.id = ihe.persona_id
                        WHERE ihe.id = ${id}`

        const [rowsDocumnto] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaaaa);
        let tmp = []
        if (rowsDocumnto.length > 0) {
            const result = await sql.query(`select * from BDSistComp.dbo.historias where Nro_DocIdenti='${rowsDocumnto[0].documento}'`)
            tmp = result.recordset
        }
        res.status(200).json({
            datos: evolucionRows,
            cabecera: tmp
        })
    } catch (e) {
        res.status(200).json({
            error: 'Ocurrio un error'
        })
    }
}
const getHojaNotasIngreso = async (req, res) => {

    try {
        var id = req.params.id
        var consulta = `SELECT 
                            ihe.persona_internacion_id,
                            ihe.descripcion,
                            DATE_FORMAT(ihe.creado_en, "%e/%c/%Y %H:%i") fechahora ,
                            CONCAT(apellidos,' ',nombres) persona_crea,
                            (SELECT nombre FROM vesalio.especialidad where id = (SELECT especialidad_id FROM vesalio.asignacion WHERE personal_id = pl.id LIMIT 1 )) nombre_especialidad
                        FROM vesalio.internacion_hoja_nota_ingreso ihe
                        INNER JOIN vesalio.usuario u ON ihe.creado_por_id = u.id
                        INNER JOIN vesalio.personal pl ON pl.id = u.personal_id
                        INNER JOIN vesalio.persona p ON p.id = pl.persona_id
                        WHERE persona_internacion_id = ${id}
                        ORDER BY ihe.id desc`

        const [evolucionRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        var consultaaaa = `SELECT 
                            documento
                        FROM vesalio.internacion_persona ihe
                        INNER JOIN vesalio.persona p ON p.id = ihe.persona_id
                        WHERE ihe.id = ${id}`

        const [rowsDocumnto] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaaaa);

        let tmp = []
        if (rowsDocumnto.length > 0) {
            const result = await sql.query(`select * from BDSistComp.dbo.historias where Nro_DocIdenti='${rowsDocumnto[0].documento}'`)
            tmp = result.recordset
        }


        res.status(200).json({
            datos: evolucionRows,
            cabecera: tmp
        })
    } catch (e) {
        console.log(e)
        res.status(200).json({
            error: 'Ocurrio un error'
        })
    }
}
const getNotasEnfermeria = async (req, res) => {

    try {
        var id = req.params.id
        var consulta = `SELECT 
                            ihen.nota descripcion,
                            ihen.id,
                        DATE_FORMAT(ihen.fecha, "%e/%c/%Y %H:%i") fechahora ,
                        CONCAT(apellidos,' ',nombres) persona_crea,
                        (SELECT nombre FROM vesalio.especialidad where id = (SELECT especialidad_id FROM vesalio.asignacion WHERE personal_id = pl.id LIMIT 1 )) nombre_especialidad 
                        FROM vesalio.internacion_hoja_enfermeria_notas ihen
                        INNER JOIN vesalio.usuario u ON ihen.creado_por_id = u.id
                        INNER JOIN vesalio.personal pl ON pl.id = u.personal_id
                        INNER JOIN vesalio.persona p ON p.id = pl.persona_id 
                        WHERE persona_internacion_id = ${id}
                        ORDER BY ihen.id desc`

        const [evolucionRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        var consultaaaa = `SELECT 
        documento
    FROM vesalio.internacion_persona ihe
    INNER JOIN vesalio.persona p ON p.id = ihe.persona_id
    WHERE ihe.id = ${id}`

        const [rowsDocumnto] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaaaa);
        let tmp = []
        if (rowsDocumnto.length > 0) {
            const result = await sql.query(`select * from BDSistComp.dbo.historias where Nro_DocIdenti='${rowsDocumnto[0].documento}'`)
            tmp = result.recordset
        }
        res.status(200).json({
            datos: evolucionRows,
            cabecera: tmp
        })
    } catch (e) {
        res.status(200).json({
            error: 'Ocurrio un error'
        })
    }
}
const getInterconsulta = async (req, res) => {
    try {
        var id = req.params.id
        var consulta = `SELECT 
                            ii.descripcionSolicitud,
                            ii.id,
                            s.nombre,
                            ii.tipoInterconsulta,
                            CONCAT(p.apellidos, ' ',p.nombres) solicitante,
                            CONCAT(p2.apellidos, ' ',p2.nombres) solicitado,
                            iic.comentario,
                            DATE_FORMAT(ii.created_at, "%e/%c/%Y %H:%i") fechahora,
                            DATE_FORMAT(ii.created_at, "%e/%c/%Y") fecha_,
                            DATE_FORMAT(ii.created_at, "%H:%i") hora_,
                            DATE_FORMAT(iic.created_at, "%e/%c/%Y %H:%i") fechahoraRPTA,
                            DATE_FORMAT(iic.created_at, "%e/%c/%Y") fecha_rpta,
                            DATE_FORMAT(iic.created_at, "%H:%i") hora_rpta
                        FROM vesalio.internacion_interconsulta ii 
                        INNER JOIN vesalio.especialidad s ON s.id = ii.especialidad_id
                        INNER JOIN vesalio.personal pl ON ii.profesional_solicitante_id = pl.id
                        inner JOIN  vesalio.persona p ON p.id = pl.persona_id
                        left join vesalio.internacion_interconsulta_comentarios iic on iic.interconsulta_id = ii.id  AND iic.borrado_logico != 1
                        left JOIN vesalio.personal pl2 ON iic.profesional_id = pl2.id
                        left JOIN  vesalio.persona p2 ON p2.id = pl2.persona_id
                        WHERE persona_internacion_id = ${id} AND  ii.borrado_logico != 1 `

        const [evolucionRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        var consultaaaa = `SELECT 
                            documento
                        FROM vesalio.internacion_persona ihe
                        INNER JOIN vesalio.persona p ON p.id = ihe.persona_id
                        WHERE ihe.id = ${id}`

        const [rowsDocumnto] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consultaaaa);

        let tmp = []
        if (rowsDocumnto.length > 0) {
            const result = await sql.query(`select * from BDSistComp.dbo.historias where Nro_DocIdenti='${rowsDocumnto[0].documento}'`)
            tmp = result.recordset
        }


        res.status(200).json({
            datos: evolucionRows,
            cabecera: tmp
        })

    } catch (e) {
        res.status(200).json({
            error: 'Ocurrio un error'
        })
    }
}
const insertInterconsulta = async (req, res) => {
    try {
        const { personaInternacion, personalId, especiliadadId, tipoConsulta, descripcionSolicitud, documento } = req.body;

        var consulta = `insert into vesalio.internacion_interconsulta
                                (persona_internacion_id,medico_solicitado_id,creadopor_id,modificadopor_id,especialidad_id,profesional_solicitante_id,tipoInterconsulta,descripcionSolicitud,borrado_logico,created_at,updated_at)
                                values(
                                    ${personaInternacion},
                                    ${personalId},
                                    (SELECT 
                                        u.id 
                                    FROM vesalio.usuario u
                                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                    WHERE documento ='${documento}'),
                                    (SELECT 
                                        u.id 
                                    FROM vesalio.usuario u
                                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                    WHERE documento ='${documento}'),
                                    ${especiliadadId},
                                    (SELECT 
                                        pl.id 
                                    FROM vesalio.personal  pl
                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                    WHERE documento ='${documento}'),
                                    '${tipoConsulta}',
                                    '${descripcionSolicitud}',
                                    0,
                                    (select now()),
                                    (select now())
                                )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        res.status(200).json('correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el hoja evolución.' })
    }
}
const insertInterconsultaComentarios = async (req, res) => {
    try {
        const { interconsultaId, documento, descripcionSolicitud } = req.body;

        var consulta = `insert into vesalio.internacion_interconsulta_comentarios
        (interconsulta_id,creadopor_id, profesional_id, comentario,borrado_logico,created_at)
                                values(
                                    ${interconsultaId},
                                    (SELECT 
                                        u.id 
                                    FROM vesalio.usuario u
                                    INNER JOIN vesalio.personal  pl ON pl.id=u.personal_id
                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                    WHERE documento ='${documento}'),
                                    (SELECT 
                                        pl.id 
                                    FROM vesalio.personal  pl
                                    INNER JOIN vesalio.persona p ON pl.persona_id = p.id
                                    WHERE documento ='${documento}'),
                                    '${descripcionSolicitud}',
                                    0,
                                    (select now())
                                )`
        await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        res.status(200).json('correcto')

    } catch (e) {
        console.log(e);
        res.status(200).json({ error: 'Ocurrio un error al ingresar el hoja evolución.' })
    }
}
const getDietas = async (req, res) => {

    try {
        var consulta = `SELECT * FROM vesalio.internacion_dieta WHERE borrado_logico != 1 ORDER BY descripcion`
        const [dietasRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);

        var consulta1 = `SELECT * FROM vesalio.internacion_consistencia WHERE borrado_logico != 1 ORDER BY descripcion`
        const [concistenciaRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta1);

        var consulta2 = `SELECT * FROM vesalio.internacion_oxigenoterapia WHERE borrado_logico != 1 ORDER BY descripcion`
        const [oxigenoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta2);

        var consulta3 = `SELECT * FROM vesalio.internacion_periodicidad_nebulizaciones WHERE borrado_logico != 1 ORDER BY descripcion`
        const [nebulizacionRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta3);

        var consulta4 = `SELECT * FROM vesalio.internacion_kinesioterapia WHERE borrado_logico != 1 ORDER BY descripcion`
        const [kinesioterapiaRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta4);

        res.status(200).json({
            dieta: dietasRows,
            concistenacia: concistenciaRows,
            oxigeno: oxigenoRows,
            nebulizaciones: nebulizacionRows,
            kinesioterapias: kinesioterapiaRows
        })
    } catch (e) {
        res.status(200).json({
            error: 'Ocurrio un error'
        })
    }
}
const getCamasEmergencia = async (req, res) => {

    try {
        var consulta = `select * from vesalio.internacion_cama where habitacion_id in (168,169,170,171)`
        const [rows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);


        res.status(200).json(rows.reduce((arr, item) => {
            arr.push(item.id)
            return arr
        }, []))
    } catch (e) {
        res.status(200).json({
            error: 'Ocurrio un error'
        })
    }
}
const getEstudiosExamenesNew = async (req, res) => {
    try {
        var consulta = `select * from vesalio.estudios_examenes`
        const [documentoRows] = await conexion.find(x => x.nombre === 'servidor_copia').connect.query(consulta);
        res.status(200).json(documentoRows)
    } catch (e) {
        console.log(e);
        res.status(400).json("error")
    }
}
module.exports = {
    cambiarUsuario,
    accessoSistemaMedico,
    updateDoctorTratante,
    getPersonaHistoriaPDFCabecera,
    insertConsultaBasicaAmbulatoria,
    insertHojaNotaIngreso,
    getHojaNotasIngreso,
    insertTriaje,
    insertTriajeEmergencia,
    insertBalance,
    getTurnoProgamadoListaFechaMedico,
    getHistoriaPaciente,
    getDiagnosticos,
    getMedicamentos,
    getFamiliaRol,
    getEstudios,
    getFrecuencia_viaAdministracion,
    getAntecedentePatologico,
    insertAntecedentePatologico,
    removeAntecedentePatologico,
    getAntecedenteNoPatologico,
    insertAntecedenteNoPatologico,
    removeAntecedenteNoPatologico,
    getAntecedenteMedicamento,
    insertAntecedenteMedicamento,
    removeAntecedenteMedicamento,
    getAntecedenteHeredoFamiliar,
    insertAntecedenteHeredoFamiliar,
    removeAntecedenteHeredoFamiliar,
    getAntecedenteQuirurgico,
    insertAntecedenteQuirurgico,
    removeAntecedenteQuirurgico,
    getConsultaBasica,
    getConsultaBasicaGinecologia,
    getInformacionAdicional,
    getConsultaOftalomologia,
    getConsultaOftalomologiaDetalle,
    getEnfermeria,
    getHabitacion,
    getCamaPaciente,
    getDiagnosticosInternacion,
    getHojaEvolcuion,
    getNotasEnfermeria,
    getInterconsulta,
    getDietas,
    insertInformacionAdicional,
    updateInformacionAdicional,
    insertEstudiosEmergencia,
    getEstudiosEmergencia,
    insertHojaEvolucion,
    insertInterconsulta,
    insertInterconsultaComentarios,
    insertNotasEnfermeria,
    insertIndicaciones,
    getIndicacionesView,
    getIndicacionesViewExtras,
    getIndicacionesEnfermeriaView,
    insertIndicacionesEnfermeria,
    getNoMostrarEmergencia,
    getMedicionAmulatorioEmergencia,
    getMedicionEmergenciaEnfermeria,
    insertConsultaBasica,
    insertAlta,
    getOrdenesHospitalizacion,
    insertCamaHospitalizacion,
    getHistoriaPacienteAntecedentes,
    getCamasEmergencia,
    getPersonaHistoria,
    getHistoriaPacienteEnfermera,
    getPersonaHistoriaPDF,
    getEstudiosExamenesNew
}
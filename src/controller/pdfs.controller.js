const { sql } = require('../db/sql');

var pdf = require('html-pdf');
const path = require('path');

const generarPdfResultado = async (req, res) => {
    try {
        const { historia, documento, ruta, titulo, contenido } = req.body;
        var cadena = `exec  BDSistComp.dbo.ServicioResultado_InsertarRegistro
                        @Nro_Historia ='${historia}',
                        @DNI_Medico ='${documento}',
                        @DNI_MedicoAte ='${documento}',
                        @Des_Ruta ='${ruta}',
                        @Obs_Titulo ='${titulo}';`
        const result = await sql.query(cadena)
        const hmtl = `<!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta http-equiv="X-UA-Compatible" content="IE=edge">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Document</title>
                            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.3.1/dist/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
                            </head>
                        <body>
                            <div style="padding:40px;">
                                ${contenido}
                            </div> 
                        </body>
                        </html>`
        let pdfRuta = `//132.157.150.53/resultado$/ECO-HUAYANAY/`
        let pdfArchivo = `${result.recordset[0].Des_File}`
        pdf.create(hmtl).toFile(path.join(pdfRuta, pdfArchivo), function (err, rpta) {
            if (err) {
                console.log(err);
            } else {
                console.log(rpta);
                res.status(200).json('correcto');
            }
        });

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'Usuario registrado correctamente'
        })
    }
}
const generarPdfResultado2 = async (req, res) => {
    try {
        const { historia, documento, ruta, titulo, contenido, rutaTexto } = req.body;
        let tituloFinal = ''
        titulo.split('').map(x => {
            if (x !== ' ') {
                tituloFinal += x
            }
            return false
        })
        var cadena = `exec  BDSistComp.dbo.ServicioResultado_InsertarRegistro
                        @Nro_Historia ='${historia}',
                        @DNI_Medico ='${documento}',
                        @DNI_MedicoAte ='${documento}',
                        @Des_Ruta ='${ruta}',
                        @Obs_Titulo ='${tituloFinal}';`
        const result = await sql.query(cadena)
        const hmtl = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
            <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet" />
            <style>
                .ql-container.ql-snow {
                    border: none !important;
                }
            </style>
            </head>
        <body>
            <div class="ql-container ql-snow">
                <div class="ql-editor" style="padding:40px;">
                        ${contenido}
                </div>
            </div>
        </body>
        </html>`
        pdf.create(hmtl).toFile(path.join(`//132.157.150.53/resultado$/${rutaTexto}/`, result.recordset[0].Des_File), function (err, rpta) {
            if (err) {
                console.log(err);
            } else {
                console.log(rpta)
                res.status(200).json('correcto');
            }
        });

    } catch (e) {
        console.log(e);
        res.status(400).json({
            error: 'Usuario registrado correctamente'
        })
    }
}
module.exports = { generarPdfResultado, generarPdfResultado2 }
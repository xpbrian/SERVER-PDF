
const Cita = require('../models/Citas')
const { wsps } = require('../helpers/wsp')
const Usuarios = require('../models/Usuarios')
const nodemailer = require('nodemailer');
const Recordatorio = require('../models/Recordatorio');

let transporter = nodemailer.createTransport({
    service: "Outlook365",
    host: "smtp.office365.com",
    port: "587",
    tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false,
    },
    auth: {
        user: "citas_web@vesalio.com.pe",
        pass: "Portalcita123.",
    },
});

const lanzarSiempreALaHora = async (hora, minutos) => {
    var ahora = new Date();
    console.log('lanzado', ahora);
    var momento = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), hora, minutos);
    if (momento <= ahora) { // la hora era anterior a la hora actual, debo sumar un día
        momento = new Date(momento.getTime() + 1000 * 60 * 60 * 24);
    }
    console.log('para ser ejecutado en', momento);
    setTimeout(async function () {
        let fecha = new Date()
        var found = await Cita.find({ fecha: fecha.toISOString().split('T')[0], "anulado.estado": false })
        for await (var num of found) {
            let recordar = await Recordatorio.find({ "turno_programado_id": num.turno_programado_id })
            console.log(recordar);
        }

        lanzarSiempreALaHora(hora, minutos);
    }, momento.getTime() - ahora.getTime());
}


module.exports = {
    lanzarSiempreALaHora
}
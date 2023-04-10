const { Client, NoAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
var wsps = []
async function conectarWSP() {
    const client = new Client({
        authStrategy: new NoAuth()
    });
    wsps.push({ wspClient: client })
    client.on('qr', async (qr) => {
        try {
            qrcode.generate(qr, { small: true });
        } catch (e) {
            console.log(e);
        }

    });
    client.on('message', async (msg) => {
        const { fromMe, from } = msg
        if (!fromMe) {
            let mensaje = `Estimado usuario (a), este mensaje fue generado automáticamente y no admite respuesta.
De tener alguna consulta, sírvase comunicarse a nuestra central telefónica (01)618-9999.`
            client.sendMessage(from, mensaje);
        }
    });

    client.on('ready', async () => {

    });
    client.on('disconnected', async () => {


    });
}

module.exports = {
    conectarWSP, wsps
}
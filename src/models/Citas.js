const { Schema, model } = require("mongoose");

const UsuariosSchema = new Schema(
    {
        datos: {
            type: Object,
            required: true,
        },
        turno_programado_id: {
            type: String,
            required: true,
        },
        hora: {
            type: String,
            required: true,
        },
        fecha: {
            type: String,
            required: true,
        },
        agenda: {
            type: Number,
            required: true,
        },
        paciente: {
            type: String,
            required: true,
        },
        anulado: {
            type: Object,
            required: true,
        },
        estado: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
    }

);

module.exports = model("Citas", UsuariosSchema);



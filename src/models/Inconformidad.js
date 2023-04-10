const { Schema, model } = require("mongoose");

const InconformidadSchema = new Schema(
    {

        motivo: {
            type: String,
            required: true,
        },
        fecha: {
            type: String,
            required: true,
        },
        doctor: {
            type: Object,
            required: true,
        },
        usuario: {
            type: Object,
            required: true,
        },
    },
    {
        timestamps: true,
    }

);

module.exports = model("Inconformidad", InconformidadSchema);



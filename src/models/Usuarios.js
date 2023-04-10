const { Schema, model } = require("mongoose");

const UsuariosSchema = new Schema(
    {
        datos: {
            type: Object,
            required: true,
        },
        cuenta: {
            type: Object,
            required: true,
        },
        siscomp: { type: Object },
        alepho: { type: Object },
        familiares: { type: Object },
        coberturas: { type: Array }
    },
    {
        timestamps: true,
    }

);

module.exports = model("Usuarios", UsuariosSchema);



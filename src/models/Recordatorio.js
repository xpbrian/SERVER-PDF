const { Schema, model } = require("mongoose");

const RecordatoriosSchema = new Schema(
    {
        turno_programado_id: {
            type: String,
            required: true,
        },
       
        celular: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
    }

);

module.exports = model("Recordatorio", RecordatoriosSchema);



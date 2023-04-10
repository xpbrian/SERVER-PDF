const mongoose = require("mongoose");
const { mongo } = require("../../../config");

const conectarMongoDB = async () => {
  try {
    await mongoose.connect(mongo.MONGODB_URI);
    console.log("conectado");
  } catch (error) {
    console.error(error);
  }
};

module.exports = { conectarMongoDB };
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in .env");
    }

    // This deployment does not support retryable writes.
    // Force retryWrites=false regardless of the existing URI.
    if (mongoUri.includes("?")) {
      mongoUri = `${mongoUri}&retryWrites=false`;
    } else {
      mongoUri = `${mongoUri}?retryWrites=false`;
    }

    // Use only supported options — modern Mongoose/driver enable new URL parser
    // and unified topology by default; explicitly disable retryable writes.
    const connection = await mongoose.connect(mongoUri, {
      retryWrites: false,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
};

module.exports = connectDB;
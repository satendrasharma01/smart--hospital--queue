require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../src/models/User");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      retryWrites: false,
    });

    console.log("MongoDB connected");

    const email = process.env.INITIAL_ADMIN_EMAIL;
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const name = process.env.INITIAL_ADMIN_NAME || "System Admin";

    if (!email || !password) {
      throw new Error(
        "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required"
      );
    }

    const existingAdmin = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingAdmin) {
      if (existingAdmin.role === "admin") {
        console.log("Admin already exists.");
        return;
      }

      throw new Error(
        "An account with this email already exists with another role."
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin",
    });

    console.log("Initial admin created successfully.");
    console.log(`Admin email: ${admin.email}`);
  } catch (error) {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();
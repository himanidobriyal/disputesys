const mongoose = require('mongoose');

async function connectDB() {
  try {
    console.log(process.env.MONGO_URI); // <-- Add this line

    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected:', mongoose.connection.name);
  } catch (err) {
    console.error(err); // <-- Change this from err.message to err
    process.exit(1);
  }
}

module.exports = connectDB;
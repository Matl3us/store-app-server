const dotenv = require("dotenv");
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const CLOUD_NAME = process.env.CLOUD_NAME;
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const PORT = process.env.PORT;
const SECRET = process.env.SECRET;

module.exports = {
  MONGODB_URI,
  CLOUD_NAME,
  API_KEY,
  API_SECRET,
  PORT,
  SECRET,
};

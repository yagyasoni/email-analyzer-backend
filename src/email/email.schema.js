const mongoose = require("mongoose");

const EmailSchema = new mongoose.Schema({
  subject: String,
  rawHeaders: String,
  receivingChain: [String],
  espType: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = { EmailSchema };

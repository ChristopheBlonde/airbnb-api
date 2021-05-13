const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: {
    unique: true,
    type: String,
  },
  name: {
    require: true,
    type: String,
  },
  account: {
    username: String,
    description: String,
  },
  token: String,
  salt: String,
  hash: String,
});

module.exports = User;

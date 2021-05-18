const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: {
    unique: true,
    type: String,
  },
  rooms: {
    type: Array,
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  },
  account: {
    photo: Object,
    username: String,
    description: String,
    name: {
      require: true,
      type: String,
    },
  },
  token: String,
  salt: String,
  hash: String,
});

module.exports = User;

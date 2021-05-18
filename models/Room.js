const mongoose = require("mongoose");

const Room = mongoose.model("Room", {
  title: String,
  description: String,
  price: Number,
  picture: {
    type: Array,
  },
  location: {
    type: Array,
    lat: Number,
    lng: Number,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = Room;

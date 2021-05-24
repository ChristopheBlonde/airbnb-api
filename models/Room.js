const mongoose = require("mongoose");

const Room = mongoose.model("Room", {
  title: String,
  description: String,
  price: Number,
  picture: {
    type: Array,
  },
  location: {
    type: [Number],
    index: "2d",
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = Room;

const User = require("../models/User");
const Room = require("../models/Room");
const mongoose = require("mongoose");

const isAuthorizedToModified = async (req, res, next) => {
  const room = await req.params.id;
  if (mongoose.Types.ObjectId.isValid(room)) {
    if (req.headers.authorization) {
      const token = await req.headers.authorization.replace("Bearer ", "");
      const testUser = await User.findOne({ token: token });
      const testRooms = await Room.findById(req.params.id);
      req.user = testUser;
      req.room = testRooms;
      let testRoom = false;
      if (testUser) {
        for (let i = 0; i < testUser.rooms.length; i++) {
          if (testUser.rooms[i].room.toString() === room) {
            testRoom = true;
          }
        }
        if (testRoom === true) {
          return next();
        } else {
          res
            .status(400)
            .json({ error: "You must be author of room for modified it" });
        }
      } else {
        res.status(400).json({ error: "Unauthorized" });
      }
    } else {
      res.status(400).json({ error: "You must be connect to update a room." });
    }
  } else {
    res.status(400).json({ error: "Bad id" });
  }
};

module.exports = isAuthorizedToModified;

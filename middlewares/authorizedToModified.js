const User = require("../models/User");

const isAuthorizedToModified = async (req, res, next) => {
  const room = await req.params.id;
  if (req.headers.authorization) {
    const token = await req.headers.authorization.replace("Bearer ", "");
    const testUser = await User.findOne({ token: token });
    if (testUser) {
      for (let i = 0; i < testUser.rooms.length; i++) {
        if (testUser.rooms[i].room.toString() === room) {
          const testRoom = testUser.rooms[i].room;
          if (testRoom) {
            return next();
          }
        } else {
          res
            .status(400)
            .json({ error: "You must be author of room for modified it" });
        }
      }
    } else {
      res.status(400).json({ error: "Unauthorized" });
    }
  } else {
    res.status(400).json({ error: "You must be connect to update a room." });
  }
};

module.exports = isAuthorizedToModified;

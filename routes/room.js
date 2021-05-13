const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/authorization");
const isAuthorizedToModified = require("../middlewares/authorizedToModified");

const User = require("../models/User");
const Room = require("../models/Room");

router.post("/room/publish", isAuthenticated, async (req, res) => {
  try {
    const { title, description, price, location } = req.fields;
    if (title && description && price && location.lat && location.lng) {
      const newRoom = new Room({
        photos: [],
        title: title,
        description: description,
        price: price,
        location: [Number(location.lat), Number(location.lng)],
        user: req.user._id,
      });
      await newRoom.save();
      const userUpdate = await User.findById({ _id: req.user._id });
      userUpdate.rooms.push({ room: newRoom._id });
      await userUpdate.save();
      res.status(200).json(newRoom);
    } else {
      res.status(400).json({ error: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/rooms", async (req, res) => {
  try {
    const offersRoom = await Room.find().select("title price photos location");
    res.status(200).json(offersRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/rooms/:id", async (req, res) => {
  try {
    const roomfind = await Room.findById(req.params.id).populate(
      "user",
      "account"
    );
    res.status(200).json(roomfind);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/room/update/:id", isAuthorizedToModified, async (req, res) => {
  try {
    const roomToUpDate = await Room.findById({ _id: req.params.id });
    if (req.fields.title) {
      roomToUpDate.title = req.fields.title;
    }
    if (req.fields.description) {
      roomToUpDate.description = req.fields.description;
    }
    if (req.fields.price) {
      roomToUpDate.price = req.fields.price;
    }
    if (req.fields.location) {
      roomToUpDate.location = req.fields.location;
    }
    await roomToUpDate.save();
    res.status(200).json(roomToUpDate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/room/delete/:id", isAuthorizedToModified, async (req, res) => {
  try {
    const roomToDelete = await Room.findByIdAndDelete(req.params.id);
    const userToDeleteRoom = await User.findOne(roomToDelete.user);
    const indexRoom = userToDeleteRoom.rooms
      .toString()
      .indexOf({ room: req.params.id });
    userToDeleteRoom.rooms.splice(indexRoom, indexRoom + 1);

    userToDeleteRoom.markModified("rooms");
    await userToDeleteRoom.save();
    res.status(200).json(userToDeleteRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
module.exports = router;

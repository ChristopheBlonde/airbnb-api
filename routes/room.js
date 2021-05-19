const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/authorization");
const isAuthorizedToModified = require("../middlewares/authorizedToModified");
const cloudinary = require("cloudinary").v2;

const User = require("../models/User");
const Room = require("../models/Room");

router.post("/room/publish", isAuthenticated, async (req, res) => {
  try {
    const { title, description, price, location } = req.fields;
    if (title && description && price && location.lat && location.lng) {
      const newRoom = new Room({
        picture: [],
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
    const filters = {};
    if (req.query.title) {
      filters.title = new RegExp(req.query.title, "i");
    }
    if (req.query.priceMin) {
      filters.price = { $gte: Number(req.query.priceMin) };
    }
    if (req.query.priceMax) {
      if (req.query.priceMin) {
        filters.price.$lte = Number(req.query.priceMax);
      } else {
        filters.price = { $lte: Number(req.query.priceMax) };
      }
    }
    const sort = {};
    if (req.query.sort) {
      if (req.query.sort === "price-asc") {
        sort.price = "asc";
      } else {
        sort.price = "desc";
      }
    }
    let limit = 10;
    let skip = 0;
    if (req.query.limit) {
      limit = await Number(req.query.limit);
    }
    if (req.query.page && req.query.page > 0) {
      skip = limit * req.query.page - limit;
    }
    const offersRoom = await Room.find(filters)
      .select("title price picture location")
      .sort(sort)
      .skip(skip)
      .limit(limit);
    const count = await Room.find(filters).countDocuments();
    res.status(200).json({ count: count, rooms: offersRoom });
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
    const roomToUpDate = await req.room;
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

router.post(
  "/room/upload_picture/:id",
  isAuthorizedToModified,
  async (req, res) => {
    try {
      const user = await req.user;
      const room = await req.room;
      const picturesKeys = Object.keys(req.files);
      if (room.picture.length + picturesKeys.length <= 5) {
        const pictures = room.picture.length;
        picturesKeys.forEach(async (pictureKey) => {
          const file = req.files[pictureKey];
          const upLoad = await cloudinary.uploader.upload(file.path, {
            folder: `airbnb/roomPictures/${user._id} `,
          });

          room.picture.push({
            url: upLoad.secure_url,
            picture_id: upLoad.public_id,
          });

          if (room.picture.length === picturesKeys.length + pictures) {
            room.save();
            return res.status(200).json(room);
          }
        });
      } else {
        res.status(400).json({ error: "You must have 5 pictures max" });
      }
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete(
  "/room/delete_picture/:id",
  isAuthorizedToModified,
  async (req, res) => {
    try {
      let room = await req.room;
      let i = 0;
      room.picture.forEach(async (value, index) => {
        i++;
        if (value.picture_id === req.fields.picture_id) {
          await cloudinary.uploader.destroy(req.fields.picture_id);
          room.picture.splice(index, 1);
          room.markModified("picture");
          room.save();
          res.status(200).json(room);
        } else if (
          room.picture.length === i &&
          room.picture[index].picture_id !== req.fields.picture_id
        ) {
          res.status(400).json({ error: "Picture not found" });
        }
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete("/room/delete/:id", isAuthorizedToModified, async (req, res) => {
  try {
    const roomToDelete = await Room.findByIdAndDelete(req.params.id);
    const userToDeleteRoom = await req.user;
    const indexRoom = userToDeleteRoom.rooms
      .toString()
      .indexOf({ room: req.params.id });
    userToDeleteRoom.rooms.splice(indexRoom, indexRoom + 1);

    userToDeleteRoom.markModified("rooms");
    await userToDeleteRoom.save();
    res.status(200).json({ message: "Room deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

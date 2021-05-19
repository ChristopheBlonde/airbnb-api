const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/authorization");
const mongoose = require("mongoose");

const User = require("../models/User");
const Room = require("../models/Room");

router.post("/user/sign_up", async (req, res) => {
  try {
    const { email, password, username, name, description } = req.fields;
    const user = await User.findOne({ email: email });
    if (!user) {
      if (password && username && name && description) {
        const salt = uid2(16);
        const hash = SHA256(salt + password).toString(encBase64);
        const newUser = new User({
          email: email,
          account: {
            username: username,
            description: description,
            name: name,
          },
          token: uid2(64),
          salt: salt,
          hash: hash,
        });
        await newUser.save();
        res.status(200).json({
          _id: newUser._id,
          token: newUser.token,
          email: newUser.email,
          username: newUser.account.username,
          description: newUser.account.description,
          name: newUser.account.name,
        });
      } else {
        res.status(400).json({ error: "Missing parameters" });
      }
    } else {
      res.status(409).json({ error: "This email already has an account." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/upload_picture/:id", isAuthenticated, async (req, res) => {
  try {
    const avatarUpLoad = await cloudinary.uploader.upload(
      req.files.picture.path,
      { folder: `/airbnb/usersAvatar/${req.user._id}` }
    );
    const user = await req.user;
    user.account.photo = {
      url: avatarUpLoad.secure_url,
      picture_id: avatarUpLoad.public_id,
    };
    user.save();
    res.status(200).json({
      account: user.account,
      _id: user._id,
      email: user.email,
      rooms: user.rooms,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/user/delete_picture/:id", isAuthenticated, async (req, res) => {
  try {
    const userUpDate = await req.user;
    await cloudinary.uploader.destroy(userUpDate.account.photo.picture_id);
    await cloudinary.api.delete_folder("airbnb/usersAvatar/" + req.params.id);
    userUpDate.account.photo = null;
    await userUpDate.save();
    res.status(200).json({
      _id: userUpDate._id,
      account: userUpDate.account,
      email: userUpDate.email,
      rooms: userUpDate.rooms,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/log_in", async (req, res) => {
  try {
    const checkUser = await User.findOne({ email: req.fields.email });
    if (checkUser) {
      const newHash = SHA256(checkUser.salt + req.fields.password).toString(
        encBase64
      );
      if (newHash === checkUser.hash) {
        res.status(200).json({
          _id: checkUser._id,
          token: checkUser.token,
          email: checkUser.email,
          username: checkUser.account.username,
          description: checkUser.account.description,
          name: checkUser.account.name,
        });
      } else {
        res.status(401).json({ error: "Bad email or password" });
      }
    } else {
      res.status(400).json({ error: "Unauthorizated" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/user/:id", async (req, res) => {
  try {
    if (await mongoose.Types.ObjectId.isValid(req.params.id)) {
      const watchUser = await User.findById({ _id: req.params.id }).select(
        "_id account rooms"
      );
      res.status(200).json(watchUser);
    } else {
      res.status(400).json({ message: "Invalid id" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/user/rooms/:id", async (req, res) => {
  try {
    if (await mongoose.Types.ObjectId.isValid(req.params.id)) {
      const rooms = await User.findById({ _id: req.params.id }).select("rooms");
      const detailsRoom = [];
      const tab = rooms.rooms;
      for (let i = 0; i < tab.length; i++) {
        const details = await Room.findById(tab[i].room);
        detailsRoom.push(details);
      }
      res.status(200).json(detailsRoom);
    } else {
      res.status(400).json({ message: "Invalid id" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
module.exports = router;

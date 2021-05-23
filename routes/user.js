const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/authorization");
const mongoose = require("mongoose");
const mailgun = require("mailgun-js");
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

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
            photo: null,
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
    const user = await req.user;
    if (user._id.toString() === req.params.id) {
      if (user.account.photo === null) {
        const avatarUpLoad = await cloudinary.uploader.upload(
          req.files.picture.path,
          { folder: `/airbnb/usersAvatar/${req.user._id}` }
        );
        user.account.photo = {
          url: avatarUpLoad.secure_url,
          picture_id: avatarUpLoad.public_id,
        };
        await user.save();
        res.status(200).json({
          account: user.account,
          _id: user._id,
          email: user.email,
          rooms: user.rooms,
        });
      } else {
        res.status(400).json({
          message: "You must delete picture befor upload a new one. ",
        });
      }
    } else {
      res.status(400).json({ message: "bad user." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/user/delete_picture/:id", isAuthenticated, async (req, res) => {
  try {
    const userUpDate = await req.user;
    if (userUpDate._id.toString() === req.params.id) {
      if (userUpDate.account.photo !== null) {
        await cloudinary.uploader.destroy(userUpDate.account.photo.picture_id);
        await cloudinary.api.delete_folder(
          "airbnb/usersAvatar/" + req.params.id
        );
        userUpDate.account.photo = null;
        await userUpDate.save();
        res.status(200).json({
          _id: userUpDate._id,
          account: userUpDate.account,
          email: userUpDate.email,
          rooms: userUpDate.rooms,
        });
      } else {
        res.status(400).json({ message: "Picture already deleted" });
      }
    } else {
      res.status(400).json({ message: "bad user." });
    }
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

router.put("/user/update", isAuthenticated, async (req, res) => {
  try {
    const updateUser = await req.user;
    if (
      req.fields.name ||
      req.fields.username ||
      req.fields.email ||
      req.fields.description
    ) {
      const checkUserName = await User.findOne({
        "account.username": new RegExp(req.fields.username, "i"),
      });
      const checkEmail = await User.findOne({ email: req.fields.email });
      if (!checkUserName && !checkEmail) {
        if (req.fields.username) {
          updateUser.account.username = req.fields.username;
        }
        if (req.fields.email) {
          updateUser.email = req.fields.email;
        }
        if (req.fields.name) {
          updateUser.account.name = req.fields.name;
        }
        if (req.fields.description) {
          updateUser.account.description = req.fields.description;
        }
        await updateUser.save();
        res.status(200).json({
          _id: updateUser._id,
          email: updateUser.email,
          account: updateUser.account,
          rooms: updateUser.rooms,
        });
      } else if (checkUserName && !checkEmail) {
        res.status(400).json({ error: "Username already used" });
      } else if (checkEmail && !checkUserName) {
        res.status(400).json({ error: "Email already used" });
      } else if (checkUserName && checkEmail) {
        res.status(400).json({ error: "Email and Username already used" });
      }
    } else {
      res.status(400).json({ message: "One parameter must be changed." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/user/update_password", isAuthenticated, async (req, res) => {
  try {
    const user = await req.user;
    const previousPassword = SHA256(
      user.salt + req.fields.previousPassword
    ).toString(encBase64);
    const newPassword = SHA256(user.salt + req.fields.newPassword).toString(
      encBase64
    );
    if (previousPassword === user.hash) {
      if (newPassword !== user.hash) {
        const newSalt = uid2(16);
        const newToken = uid2(64);
        const newHash = SHA256(newSalt + req.fields.newPassword).toString(
          encBase64
        );
        user.salt = newSalt;
        user.token = newToken;
        user.hash = newHash;
        await user.save();

        const dataMail = {
          from: "no-reply@airbnb-api.com",
          to: user.email,
          subject: "Airbnb-api password",
          text: "Your password successfully changed",
        };

        await mg.messages().send(dataMail, (error, body) => {
          console.log(body);
          res.status(200).json({ message: "password changed" });
        });
      } else {
        res.status(400).json({ error: "Password must be different" });
      }
    } else {
      res.status(400).json({ error: "password false" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/recover_password", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.fields.email });
    if (user) {
      const tempToken = uid2(64);
      const mailSend = {
        to: user.email,
        from: "noreply@airbnb-api.com",
        subject: "recover password",
        text: `Link to /user/reset_password ${tempToken}`,
      };
      mg.messages().send(mailSend, () => {
        console.log("sending ok");
      });
      const timeSet = Date.now();
      user.temporaryToken = tempToken;
      user.timestamp = timeSet;
      await user.save();
      res.status(200).json({ message: "A link has been sent to the user." });
    } else {
      res.status(400).json({ message: "Email not found." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/reset_password", async (req, res) => {
  try {
    const user = await User.findOne({
      temporaryToken: req.fields.passwordToken,
    });
    const time = Date.now();
    if (15 * 60000 > time - user.timestamp) {
      const newSalt = uid2(16);
      const newHash = SHA256(newSalt + req.fields.password).toString(encBase64);
      user.salt = newSalt;
      user.hash = newHash;
      await user.save();
      res
        .status(200)
        .json({ _id: user._id, email: user.email, token: user.token });
    } else {
      res.status(400).json({ message: "Time exceed try again." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/user/delete/:id", isAuthenticated, async (req, res) => {
  try {
    user = await req.user;
    if (user.account.photo !== null) {
      await cloudinary.api.delete_resources_by_prefix(
        "airbnb/usersAvatar/" + user._id
      );
      await cloudinary.api.delete_folder("airbnb/usersAvatar/" + user._id);
    }
    console.log(user.rooms[0]);
    if (user.rooms[0] !== null) {
      for (let i = 0; i < user.rooms.length; i++) {
        const roomToDelete = await Room.findByIdAndDelete(user.rooms[i].room);
        let deletedPicture = false;
        console.log(roomToDelete);
        if (roomToDelete.picture.length > 0) {
          await cloudinary.api.delete_resources_by_prefix(
            `airbnb/roomPictures/${user._id} `
          );
          deletedPicture = true;
        }
        if (deletedPicture === true) {
          await cloudinary.api.delete_folder(
            `airbnb/roomPictures/${user._id} `
          );
        }
      }
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
module.exports = router;

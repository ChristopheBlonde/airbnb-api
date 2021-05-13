const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const User = require("../models/User");

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
module.exports = router;

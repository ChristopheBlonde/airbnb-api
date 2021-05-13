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
          name: name,
          account: {
            username: username,
            description: description,
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

module.exports = router;

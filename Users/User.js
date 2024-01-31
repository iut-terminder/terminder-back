import express from "express";
import User from "./UserSchema.js";
import RefreshToken from "../tokens/tokensSchema.js";
import validator from "email-validator";
import { send_email } from "../services/mail.js";
import jwt from "jsonwebtoken";

const UserAPI = express.Router();

UserAPI.get("/verify", async (req, res) => {
  try {
    const { student_number } = jwt.verify(
      req.query.token,
      process.env.AUTH_EMAIL_TOKEN_SECRET
    );

    let user = await User.findOne({ student_number: student_number });

    if (!user) {
      res.status(404).send({ status: "student not found" });
      return;
    }

    user.isEmailVerified = true;
    await user.save();

    res.redirect(`${process.env.FRONT_URL}/?signup=successful`);
  } catch (err) {
    res.redirect(`${process.env.FRONT_URL}/?signup=failed&err=${err}`);
  }
});

UserAPI.post("/signup", async (req, res) => {
  const { student_number, email, password } = req.body;
  try {
    let user = await User.findOne({
      student_number: student_number.trim(),
    });

    if (user && user.isEmailVerified) {
      res
        .status(406)
        .send({ status: "this student_number previously signed up" });
      return;
    }

    const payload = {
      student_number: student_number.trim(),
    };

    const emailToken = jwt.sign(payload, process.env.AUTH_EMAIL_TOKEN_SECRET, {
      expiresIn: "15m",
    });

    if (user && !user.isEmailVerified) {
      send_email(email.trim(), emailToken);
      res.status(200).send({
        status:
          "your account already exist but not verified. verification email was send again.",
      });
      return;
    }

    if (password.trim().length < 6)
      throw Error("password must have 6 chcaracter");

    if (!validator.validate(email.trim())) throw Error("email is not valid.");

    if (!email.trim().endsWith("iut.ac.ir"))
      throw Error("email must be from iut.");

    user = new User({
      student_number: student_number.trim(),
      email: email.trim(),
      isAdmin: false,
      isEmailVerified: false,
      playlists: [],
    });

    user.setPassword(password);
    await user.save();

    if (await send_email(email.trim(), emailToken))
      res.status(200).send({ status: "verification email was send for you." });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

UserAPI.post("/login", async (req, res) => {
  const { student_number, password } = req.body;

  try {
    const user = await User.findOne({
      student_number: student_number.trim(),
      isEmailVerified: true,
    });

    if (!user) {
      res
        .status(404)
        .send({ status: "student not found or email not verified" });
      return;
    }

    if (!user.validPassword(password)) {
      res.status(406).send({ status: "incorrect password" });
      return;
    }

    const payload = {
      student_number: user.student_number,
      isAdmin: user.isAdmin,
    };

    const accessToken = jwt.sign(
      payload,
      process.env.AUTH_ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.AUTH_ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.AUTH_REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.AUTH_REFRESH_TOKEN_EXPIRY }
    );

    const refreshT = new RefreshToken({
      userId: user._id,
      token: refreshToken,
    });
    await refreshT.save();

    res.status(200).send({
      accessToken: accessToken,
      refreshToken: refreshToken,
      type: user.isAdmin,
    });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

UserAPI.post("/add_admin", async (req, res) => {
  const { student_number } = req.body;
  const { accesstoken } = req.headers;

  try {
    const result = jwt.verify(
      accesstoken,
      process.env.AUTH_ACCESS_TOKEN_SECRET
    );

    if (!result.isAdmin) {
      res.status(406).send({ status: "permission denied." });
      return;
    }

    let user = await User.findOne({
      student_number: student_number.trim(),
    });

    if (!user) {
      res.status(406).send({ status: "user not found!" });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(406).send({ status: "this user's email is not verified" });
      return;
    }

    if (user.isAdmin) {
      res.status(406).send({ status: "this user was admin already." });
      return;
    }

    user.isAdmin = true;
    await user.save();
    res.status(200).send({ status: "this user set to admin succussfully" });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

export default UserAPI;

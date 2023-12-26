import express from 'express';
import User from './UserSchema.js';
import RefreshToken from '../tokens/tokensSchema.js';
import validator from 'email-validator';
import { send_email } from '../services/mail.js';
import jwt from 'jsonwebtoken';

const UserAPI = express.Router();

UserAPI.get('/verify', async (req, res) => {
  try {
    const { student_number, email, password, isAdmin } = jwt.verify(
      req.query.token,
      process.env.AUTH_EMAIL_TOKEN_SECRET
    );

    const user = new User({
      student_number: student_number,
      email: email,
      isAdmin: isAdmin,
      playlists: [],
    });

    user.setPassword(password);
    await user.save();

    res.status(200).send({ status: 'your account created successfully..' });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

UserAPI.post('/signup', async (req, res) => {
  const { student_number, email, password, isAdmin } = req.body;
  try {
    let user = await User.findOne({ student_number: student_number.trim() });

    if (user) {
      res.status(406).send({ status: 'this email previously signed up' });
      return;
    }

    if (password.trim().length < 6)
      throw Error('password must have 6 chcaracter');

    if (!validator.validate(email.trim())) throw Error('email is not valid.');

    if (!email.trim().endsWith('iut.ac.ir'))
      throw Error('email must be from iut.');

    const payload = {
      student_number: student_number.trim(),
      email: email.trim(),
      password: password.trim(),
      isAdmin: isAdmin ? isAdmin : false,
    };

    const emailToken = jwt.sign(payload, process.env.AUTH_EMAIL_TOKEN_SECRET, {
      expiresIn: '5m',
    });

    send_email(email.trim(), emailToken);

    res.status(200).send({ status: 'verification email was send for you.' });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

UserAPI.post('/login', async (req, res) => {
  const { student_number, password } = req.body;

  try {
    const user = await User.findOne({ student_number: student_number.trim() });

    if (!user) {
      res.status(404).send({ status: 'email not found' });
      return;
    }

    if (!user.validPassword(password)) {
      res.status(406).send({ status: 'incorrect password' });
      return;
    }

    const payload = { student_id: user._id, isAdmin: user.isAdmin };

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

UserAPI.post('/check', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await search(email);

    if (user === -1) {
      res.status(404).send({ status: 'email not found' });
      return;
    } else if (user) {
      res.status(200).send({ status: 'valid user' });
      return;
    }
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

export default UserAPI;

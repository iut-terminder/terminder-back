import express from 'express';
import RefreshToken from './tokensSchema.js';
import { send_email } from '../services/mail.js';
import jwt from 'jsonwebtoken';
import User from '../Users/UserSchema.js';

const RefreshTokenAPI = express.Router();

RefreshTokenAPI.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const tokenRecord = await RefreshToken.findOne({
      token: refreshToken.trim(),
    });

    if (!tokenRecord) {
      res.status(404).send({ status: 'Invalid token' });
      return;
    }

    const payload = jwt.verify(
      refreshToken,
      process.env.AUTH_REFRESH_TOKEN_SECRET
    );

    const accessToken = jwt.sign(
      { student_id: payload.student_id, isAdmin: payload.isAdmin },
      process.env.AUTH_ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.AUTH_ACCESS_TOKEN_EXPIRY }
    );

    res.status(200).send({
      accessToken: accessToken,
      type: payload.isAdmin,
    });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

RefreshTokenAPI.post('/delete', async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const tokenRecord = await RefreshToken.findOne({
      token: refreshToken.trim(),
    });

    if (!tokenRecord) {
      res.status(404).send({ status: 'Invalid token' });
      return;
    }

    const payload = jwt.verify(
      refreshToken,
      process.env.AUTH_REFRESH_TOKEN_SECRET
    );

    await tokenRecord.deleteOne();

    res.status(200).send({ status: 'logout successfully.' });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

export default RefreshTokenAPI;

import express from 'express';
import User from '../Users/UserSchema.js';
import Lesson from '../Lessons/LessonSchema.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

const PlaylistAPI = express.Router();

PlaylistAPI.post('/add_playlist', async (req, res) => {
  //console.log("📨 درخواست add_playlist دریافت شد");
  //console.log("📦 بدنه:", JSON.stringify(req.body, null, 2));
  //console.log("🔑 DEFAULT_COLOR از env:", process.env.DEFAULT_COLOR);
  
  const { playlist } = req.body;
  const { accesstoken } = req.headers;

  try {
    // 1. بررسی accesstoken
    if (!accesstoken) {
      console.log("❌ توکن ارسال نشده");
      return res.status(401).send({ error: 'Token required' });
    }

    const result = jwt.verify(
      accesstoken,
      process.env.AUTH_ACCESS_TOKEN_SECRET
    );
    
    console.log("✅ توکن معتبر برای کاربر:", result.student_number);

    // 2. پیدا کردن کاربر
    let user = await User.findOne({ student_number: result.student_number });
    console.log("👤 کاربر یافت شد؟", !!user);

    if (!user) {
      return res.status(404).send({ status: 'user not found' });
    }

    // 3. بررسی تعداد پلی‌لیست
    if (user.playlists.length === 5) {
      return res.status(406).send({ status: 'this user have 5 playlist' });
    }

    // 4. اعتبارسنجی و ساخت playlist
    console.log("🎨 پردازش playlist دریافتی:", playlist);
    
    // رنگ پیش‌فرض - حل مشکل #
    const defaultColor = process.env.DEFAULT_COLOR 
      ? (process.env.DEFAULT_COLOR.startsWith('#') 
          ? process.env.DEFAULT_COLOR 
          : `#${process.env.DEFAULT_COLOR}`)
      : "#248F24";
    
    console.log("🎨 رنگ پیش‌فرض نهایی:", defaultColor);

    const validatedPlaylist = playlist.map((item, index) => {
      console.log(`📝 آیتم ${index + 1}:`, item);
      
      // بررسی lesson
      if (!item.lesson || typeof item.lesson !== 'string') {
        throw new Error(`Invalid lesson ID at index ${index}`);
      }
      
      // بررسی و تنظیم رنگ
      const color = item.color && item.color.trim() !== '' 
        ? item.color 
        : defaultColor;
      
      return {
        color: color,
        lesson: item.lesson.trim()
      };
    });

    console.log("✅ playlist معتبر شده:", validatedPlaylist);

    // 5. ذخیره
    user.playlists.push({ playlist: validatedPlaylist });
    await user.save();

    console.log("💾 ذخیره در دیتابیس موفقیت‌آمیز");

    return res.status(200).send({
      status: 'complete successfully',
      id: user.playlists.slice(-1)[0]._id,
    });
    
  } catch (err) {
    console.error("❌ خطا در add_playlist:", err.message);
    console.error("Stack trace:", err.stack);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).send({ error: 'Invalid token' });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).send({ error: 'Validation error: ' + err.message });
    }
    
    return res.status(400).send({ error: err.message });
  }
});

PlaylistAPI.get('/get_playlist', async (req, res) => {
  const { accesstoken } = req.headers;

  try {
    const result = jwt.verify(
      accesstoken,
      process.env.AUTH_ACCESS_TOKEN_SECRET
    );

    let user = await User.findOne({ student_number: result.student_number });

    if (!user) {
      res.status(404).send({ status: 'email not found' });
      return;
    }

    const populatedPlaylists = [];

    for (const playlist of user.playlists) {
      const populatedPlaylist = [];

      for (const lesson of playlist.playlist) {
        const populatedLesson = await Lesson.findOne({ _id: lesson.lesson });
        populatedPlaylist.push({
          color: lesson.color,
          lesson: populatedLesson,
        });
      }

      populatedPlaylists.push({
        _id: playlist._id,
        playlist: populatedPlaylist,
      });
    }

    res.status(200).send(populatedPlaylists);
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

PlaylistAPI.post('/edit_playlist', async (req, res) => {
  let { playlist, id } = req.body;
  const { accesstoken } = req.headers;
  id = new ObjectId(id);

  try {
    const result = jwt.verify(
      accesstoken,
      process.env.AUTH_ACCESS_TOKEN_SECRET
    );

    let user = await User.findOne({ student_number: result.student_number });

    if (!user) {
      res.status(404).send({ status: 'user not found' });
      return;
    }

    for (const item of playlist) {
      if (item.color === undefined) {
        res.status(406).send({ error: 'Invalid entered playlist.' });
        return;
      }
    }

    let index = 0;

    for (const _playlist of user.playlists) {
      if (id.equals(_playlist._id)) {
        user.playlists[index].playlist = playlist;
        await user.save();
        res.status(200).send({ status: 'playlist edited succesfully' });
        return;
      }
      index++;
    }
    res.status(404).send({ status: 'playlist is not found' });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

PlaylistAPI.delete('/delete_playlist', async (req, res) => {
  let { id } = req.body;
  const { accesstoken } = req.headers;
  id = new ObjectId(id);

  try {
    const result = jwt.verify(
      accesstoken,
      process.env.AUTH_ACCESS_TOKEN_SECRET
    );

    let user = await User.findOne({ student_number: result.student_number });

    if (!user) {
      res.status(404).send({ status: 'user not found' });
      return;
    }

    let index = 0;

    for (const _playlist of user.playlists) {
      if (id.equals(_playlist._id)) {
        user.playlists.splice(index, 1);
        await user.save();
        res.status(200).send({ status: 'playlist deleted succesfully' });
        return;
      }
      index++;
    }
    res.status(404).send({ status: 'playlist is not found' });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

export default PlaylistAPI;

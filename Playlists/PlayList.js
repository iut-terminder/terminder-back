import express from 'express';
import User from '../Users/UserSchema.js';
import Lesson from '../Lessons/LessonSchema.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

const PlaylistAPI = express.Router();

PlaylistAPI.post('/add_playlist', async (req, res) => {
  const { playlist } = req.body;
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

    if (user.playlists.length === 5) {
      res.status(406).send({ status: 'this user have 5 playlist' });
      return;
    }

    for (let i = 0; i < playlist.length; i++) {
      playlist[i].color = process.env.DEFAULT_COLOR;
    }

    user.playlists.push({ playlist: playlist });
    await user.save();

    res.status(200).send({
      status: 'complete succsefuly',
      id: user.playlists.slice(-1)[0]._id,
    });
  } catch (err) {
    res.status(400).send({ error: err.message });
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

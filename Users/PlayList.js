import express from 'express';
import User from './UserSchema.js';
import Lesson from '../Lessons/LessonSchema.js';
import { ObjectId } from 'mongodb';
import validator from 'email-validator';
import { send_email } from '../services/mail.js';
import jwt from 'jsonwebtoken';
import UserAPI from './User.js';

UserAPI.post('/add_playlist', async (req, res) => {
  const { email, playlist } = req.body;

  try {
    const user = await search(email);

    if (user === -1) {
      res.status(404).send({ status: 'email not found' });
      return;
    }

    if (user.playlists.length === 5) {
      res.status(406).send({ status: 'this user have 5 playlist' });
      return;
    }

    user.playlists.push(playlist);
    await user.save();

    res.status(200).send({
      status: 'complete succsefuly',
      id: user.playlists.slice(-1)[0]._id,
    });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

UserAPI.post('/get_playlist', async (req, res) => {
  const { email } = req.body;

  try {
    let user = await search(email);

    if (user === -1) {
      res.status(404).send({ status: 'email not found' });
      return;
    }

    const populatedPlaylists = [];

    for (const playlist of user.playlists) {
      const populatedPlaylist = [];

      for (const lessonId of playlist.playlist) {
        const populatedLesson = await Lesson.findById(lessonId);
        populatedPlaylist.push(populatedLesson);
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

UserAPI.post('/edit_playlist', async (req, res) => {
  let { email, playlist, id } = req.body;
  id = new ObjectId(id);

  try {
    let user = await search(email);

    if (user === -1) {
      res.status(404).send({ status: 'email not found' });
      return;
    }

    let index = 0;

    for (const _playlist of user.playlists) {
      if (id.equals(_playlist._id)) {
        user.playlists[index].playlist = playlist.playlist;
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

UserAPI.delete('/delete_playlist', async (req, res) => {
  let { email, id } = req.body;
  id = new ObjectId(id);

  try {
    let user = await search(email);

    if (user === -1) {
      res.status(404).send({ status: 'email not found' });
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

export default UserAPI;

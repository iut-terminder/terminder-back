import express from 'express';
import User from './UserSchema.js';
import Lesson from '../Lessons/LessonSchema.js';
import { ObjectId } from 'mongodb';

const UserAPI = express.Router();

UserAPI.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    if ((await search(email.trim())) != -1) {
      res.status(406).send({ status: 'this email previously signed up' });
      return;
    }

    if (password.trim().length < 6)
      throw Error('password must have 6 chcaracter');

    const user = new User({
      email: email.trim(),
      playlists: [],
    });

    user.setPassword(password.trim());

    await user.save();
    res.status(200).send({ status: 'sign up complete succesfully' });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

UserAPI.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await search(email);

    if (user === -1) {
      res.status(404).send({ status: 'email not found' });
      return;
    }

    if (!user.validPassword(password)) {
      res.status(406).send({ status: 'incorrect password' });
      return;
    }

    res.status(200).send({ status: 'valid user' });
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
    }

    else if (user) {
      res.status(200).send({ status: 'valid user' });
      return;
    }
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});

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

    res.status(200).send({ status: 'complete succsefuly' });
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

      populatedPlaylists.push(populatedPlaylist);
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
        user.playlists[index] = playlist;
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

async function search(email) {
  const enteredUser = await User.findOne({ email: email });

  // if find email return it else return -1
  return enteredUser ? enteredUser : -1;
}

export default UserAPI;

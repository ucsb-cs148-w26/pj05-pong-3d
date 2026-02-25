import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import createLobbyRouter from './lobby/router.js';
import createUserRouter from './user/router.js';
import setupAuth from './auth/index.js';
import './db/db.js';

import { initializeGoalExplosions } from './db/initializeGoalExplosions.js';
import { initializeBallSkins } from './db/initializeBallSkins.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.set('views', path.join(import.meta.dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, '../public')));

const { parseSession } = setupAuth(app);

initializeGoalExplosions();
initializeBallSkins();

const server = app.listen(PORT);

app.use('/', createLobbyRouter(server, parseSession));
app.use('/user', createUserRouter());

export default app;

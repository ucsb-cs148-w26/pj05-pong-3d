import express from 'express';
import path from 'path';
import createLobbyRouter from './lobby/router.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.set('views', path.join(import.meta.dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.static(path.join(import.meta.dirname, '../public')));

app.get('/', (_req, res) => {
	res.render('lobbies.ejs');
});

const server = app.listen(PORT);

app.use('/', createLobbyRouter(server));

export default app;

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import createLobbyRouter from './lobby/router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ---- middleware ----
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- view engine ----
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ---- ROUTES FIRST ----
app.get('/', (_req, res) => {
  console.log('Rendering lobbies.ejs');
  res.render('lobbies');
});

// lobby + api routes
app.use(createLobbyRouter(app));

// ---- static LAST ----
app.use(express.static(path.join(__dirname, '../public')));

// ---- start server ----
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

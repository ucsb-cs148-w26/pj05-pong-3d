import session from 'express-session';
import passport from 'passport';
import setupGoogleStrategy from './google.js';

export default function setupAuth(app) {
	if (!process.env.SESSION_SECRET) throw new Error('Missing SESSION_SECRET');

	app.use(
		session({
			secret: process.env.SESSION_SECRET,
			resave: false,
			saveUninitialized: false,
			cookie: {
				httpOnly: true,
				sameSite: 'lax',
				secure: false // Set true only when using https in production
			}
		})
	);

	app.use(passport.initialize());
	app.use(passport.session());

	passport.serializeUser((user, done) => done(null, user));
	passport.deserializeUser((user, done) => done(null, user));

	setupGoogleStrategy();

	app.get(
		'/auth/google',
		passport.authenticate('google', { scope: ['profile', 'email'] })
	);

	app.get(
		'/auth/google/callback',
		passport.authenticate('google', {
			failureRedirect: '/',
			session: true
		}),
		(req, res) => {
			res.redirect('/');
		}
	);

	app.get('/auth/me', (req, res) => {
		if (!req.user) return res.status(401).json({ user: null });
		res.json({ user: req.user });
	});

	app.post('/auth/logout', (req, res, next) => {
		req.logout((err) => {
			if (err) return next(err);
			req.session.destroy(() => {
				res.clearCookie('connect.sid');
				res.json({ ok: true });
			});
		});
	});
}

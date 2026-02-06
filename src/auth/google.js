import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export default function setupGoogleAuth(app) {
	if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
		throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
	}
	if (!process.env.CALLBACK_URL) {
		throw new Error('Missing CALLBACK_URL');
	}

	const callbackURL = `${process.env.CALLBACK_URL}/auth/google/callback`;

	passport.use(
		new GoogleStrategy(
			{
				clientID: process.env.GOOGLE_CLIENT_ID,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				callbackURL,
				passReqToCallback: true
			},
			async (req, accessToken, refreshToken, profile, done) => {
				const user = {
					googleId: profile.id,
					displayName: profile.displayName,
					email: profile.emails?.[0]?.value ?? null,
					photo: profile.photos?.[0]?.value ?? null
				};
				return done(null, user);
			}
		)
	);

	passport.serializeUser((user, done) => done(null, user));
	passport.deserializeUser((user, done) => done(null, user));

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

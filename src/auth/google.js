import db from '../db/db.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export default function setupGoogleStrategy() {
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
				try {
					const googleSub = profile.id;
					const email = profile.emails?.[0]?.value;
					const displayName = profile.displayName;
					const avatarUrl = profile.photos?.[0]?.value;

					db.get(
						'SELECT * FROM users WHERE google_sub = ?',
						[googleSub],
						(err, existingUser) => {
							if (err) {
								return done(err);
							}

							if (existingUser) {
								db.run(
									`UPDATE users SET email = ?, avatar_url = ? WHERE google_sub = ?`,
									[email, avatarUrl, googleSub],
									(updateErr) => {
										if (updateErr) return done(updateErr);
										return done(null, existingUser);
									}
								);
							} else {
								db.run(
									`INSERT INTO users (google_sub, email, display_name, avatar_url)
									VALUES(?, ?, ?, ?)`,
									[googleSub, email, displayName, avatarUrl],
									function (insertErr) {
										if (insertErr) return done(insertErr);

										db.get(
											'SELECT * FROM users WHERE id = ?',
											[this.lastID],
											(fetchErr, newUser) => {
												if (fetchErr) return done(fetchErr);
												return done(null, newUser);
											}
										);
									}
								);
							}
						}
					);
				} catch (error) {
					return done(error);
				}
			}
		)
	);
}

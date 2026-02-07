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
}

import { Router } from 'express';
import db from '../db/db.js';
import PongSocketServer from '../socket.js';

function getAuthorizedEmails() {
	return new Set(
		(process.env.FEEDBACK_ADMIN_EMAILS ?? '')
			.split(',')
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean)
	);
}

function canResolveFeedback(email) {
	if (!email) return false;
	return getAuthorizedEmails().has(email.trim().toLowerCase());
}

function listFeedbackEntries(cb) {
	db.all(
		`SELECT
			id,
			author_name,
			author_email,
			message,
			status,
			resolved_by_email,
			resolved_at,
			created_at
		FROM feedback
		ORDER BY
			CASE status WHEN 'open' THEN 0 ELSE 1 END,
			datetime(created_at) DESC`,
		(err, rows) => {
			if (err) {
				cb(err);
				return;
			}

			cb(
				null,
				rows.map((row) => ({
					id: row.id,
					authorName: row.author_name,
					authorEmail: row.author_email,
					message: row.message,
					status: row.status,
					resolvedByEmail: row.resolved_by_email,
					resolvedAt: row.resolved_at,
					createdAt: row.created_at
				}))
			);
		}
	);
}

function broadcastFeedback(socket) {
	listFeedbackEntries((err, items) => {
		if (err) {
			console.error('Failed to load feedback entries:', err.message);
			return;
		}

		socket.broadcast({
			type: 'feedback:list',
			items
		});
	});
}

export default function createFeedbackRouter(server, parseSession) {
	const router = Router();
	const feedbackSocket = new PongSocketServer(
		server,
		'/feedback/ws',
		parseSession
	);

	feedbackSocket.addHandler('feedback:list', (socket, username, ws) => {
		listFeedbackEntries((err, items) => {
			if (err) {
				socket.safeSend(ws, {
					type: 'error',
					message: 'Failed to load feedback.'
				});
				return;
			}

			socket.safeSend(ws, {
				type: 'feedback:list',
				items
			});
		});
	});

	feedbackSocket.addHandler('feedback:create', (socket, username, ws, msg) => {
		const user = socket.getUser(username);
		const message = msg?.message?.trim();

		if (!user) {
			socket.safeSend(ws, {
				type: 'error',
				message: 'You must be logged in to send feedback.'
			});
			return;
		}

		if (!message) {
			socket.safeSend(ws, {
				type: 'error',
				message: 'Feedback cannot be empty.'
			});
			return;
		}

		if (message.length > 1000) {
			socket.safeSend(ws, {
				type: 'error',
				message: 'Feedback must be 1000 characters or fewer.'
			});
			return;
		}

		db.run(
			`INSERT INTO feedback (user_id, author_name, author_email, message)
			VALUES (?, ?, ?, ?)`,
			[user.id, user.display_name || user.email, user.email, message],
			(err) => {
				if (err) {
					socket.safeSend(ws, {
						type: 'error',
						message: 'Failed to save feedback.'
					});
					return;
				}

				broadcastFeedback(socket);
			}
		);
	});

	feedbackSocket.addHandler('feedback:resolve', (socket, username, ws, msg) => {
		const user = socket.getUser(username);
		const feedbackId = Number(msg?.id);

		if (!user || !canResolveFeedback(user.email)) {
			socket.safeSend(ws, {
				type: 'error',
				message: 'You are not authorized to mark feedback as done.'
			});
			return;
		}

		if (!Number.isInteger(feedbackId) || feedbackId <= 0) {
			socket.safeSend(ws, {
				type: 'error',
				message: 'Invalid feedback id.'
			});
			return;
		}

		db.run(
			`DELETE FROM feedback
			WHERE id = ?`,
			[feedbackId],
			function (err) {
				if (err) {
					socket.safeSend(ws, {
						type: 'error',
						message: 'Failed to update feedback.'
					});
					return;
				}

				if (this.changes === 0) {
					socket.safeSend(ws, {
						type: 'error',
						message: 'Feedback does not exist.'
					});
					return;
				}

				broadcastFeedback(socket);
			}
		);
	});

	router.get('/api/items', (req, res) => {
		if (!req.user) {
			return res.sendStatus(401);
		}

		listFeedbackEntries((err, items) => {
			if (err) {
				return res
					.status(500)
					.json({ ok: false, message: 'Failed to load feedback.' });
			}

			res.json({
				ok: true,
				items,
				canResolveFeedback: canResolveFeedback(req.user.email)
			});
		});
	});

	router.post('/api/items', (req, res) => {
		if (!req.user) {
			return res.sendStatus(401);
		}

		const message = req.body?.message?.trim();
		if (!message) {
			return res
				.status(400)
				.json({ ok: false, message: 'Feedback cannot be empty.' });
		}

		if (message.length > 1000) {
			return res.status(400).json({
				ok: false,
				message: 'Feedback must be 1000 characters or fewer.'
			});
		}

		db.run(
			`INSERT INTO feedback (user_id, author_name, author_email, message)
			VALUES (?, ?, ?, ?)`,
			[
				req.user.id,
				req.user.display_name || req.user.email,
				req.user.email,
				message
			],
			(err) => {
				if (err) {
					return res
						.status(500)
						.json({ ok: false, message: 'Failed to save feedback.' });
				}

				broadcastFeedback(feedbackSocket);
				res.json({
					ok: true,
					canResolveFeedback: canResolveFeedback(req.user.email)
				});
			}
		);
	});

	router.delete('/api/items/:id', (req, res) => {
		if (!req.user) {
			return res.sendStatus(401);
		}

		if (!canResolveFeedback(req.user.email)) {
			return res.status(403).json({
				ok: false,
				message: 'You are not authorized to mark feedback as done.'
			});
		}

		const feedbackId = Number(req.params.id);
		if (!Number.isInteger(feedbackId) || feedbackId <= 0) {
			return res.status(400).json({ ok: false, message: 'Invalid feedback id.' });
		}

		db.run(`DELETE FROM feedback WHERE id = ?`, [feedbackId], function (err) {
			if (err) {
				return res
					.status(500)
					.json({ ok: false, message: 'Failed to update feedback.' });
			}

			if (this.changes === 0) {
				return res
					.status(404)
					.json({ ok: false, message: 'Feedback does not exist.' });
			}

			broadcastFeedback(feedbackSocket);
			res.json({
				ok: true,
				canResolveFeedback: canResolveFeedback(req.user.email)
			});
		});
	});

	router.get('/', (req, res) => {
		if (!req.user) {
			return res.sendStatus(401);
		}

		res.render('feedback', {
			user: req.user,
			canResolveFeedback: canResolveFeedback(req.user.email)
		});
	});

	return router;
}

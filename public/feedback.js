const feedbackAccess = document.querySelector('.feedback-access');

const form = document.getElementById('feedback-form');
const messageField = document.getElementById('feedback-message');
const count = document.getElementById('feedback-count');
const status = document.getElementById('feedback-form-status');
const list = document.getElementById('feedback-list');
const refreshButton = document.getElementById('refresh-feedback');

let refreshTimer = null;
let canResolveFeedback = Boolean(window.feedbackPageConfig?.canResolveFeedback);
const currentUserEmail = window.feedbackPageConfig?.currentUserEmail ?? '';

function updateCount() {
	count.textContent = `${messageField.value.length} / 1000`;
}

function setStatus(message, kind = '') {
	status.textContent = message;
	status.className = `feedback-status${kind ? ` ${kind}` : ''}`;
}

function formatDate(value) {
	const parsed = new Date(`${value}Z`);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleString();
}

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderFeedback(items) {
	if (!items.length) {
		list.innerHTML = '<p class="feedback-empty">No feedback yet.</p>';
		return;
	}

	list.innerHTML = items
		.map((item) => {
			const canMarkDone = canResolveFeedback;

			return `
				<article class="feedback-item">
					<div class="feedback-item__meta">
						<div class="feedback-item__author">
							<strong>${escapeHtml(item.authorName)}</strong>
							<span>(${escapeHtml(item.authorEmail)})</span>
						</div>
						<div class="feedback-chip open">open</div>
					</div>
					<p class="feedback-item__message">${escapeHtml(item.message)}</p>
					<div class="feedback-item__footer">
						<span class="feedback-item__time">${escapeHtml(formatDate(item.createdAt))}</span>
						<button
							type="button"
							class="feedback-done-button"
							data-feedback-id="${item.id}"
							${canMarkDone ? '' : 'disabled'}
						>
							Done
						</button>
					</div>
				</article>
			`;
		})
		.join('');
}

function syncAccessBanner() {
	if (!feedbackAccess) return;

	feedbackAccess.classList.toggle('authorized', canResolveFeedback);
	feedbackAccess.textContent = canResolveFeedback
		? `${currentUserEmail} can remove feedback with Done.`
		: `${currentUserEmail} can submit feedback only.`;
}

async function loadFeedback(showError = true) {
	try {
		const response = await fetch('/feedback/api/items', {
			cache: 'no-store',
			credentials: 'same-origin'
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(payload.message || 'Failed to load feedback.');
		}

		canResolveFeedback = Boolean(payload.canResolveFeedback);
		syncAccessBanner();
		renderFeedback(payload.items || []);
		return true;
	} catch (error) {
		if (showError) {
			setStatus(error.message, 'error');
		}
		return false;
	}
}

form.addEventListener('submit', async (event) => {
	event.preventDefault();

	const message = messageField.value.trim();
	if (!message) {
		setStatus('Enter feedback before submitting.', 'error');
		return;
	}

	try {
		const response = await fetch('/feedback/api/items', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'same-origin',
			body: JSON.stringify({ message })
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(payload.message || 'Failed to save feedback.');
		}

		canResolveFeedback = Boolean(payload.canResolveFeedback);
		syncAccessBanner();
		messageField.value = '';
		updateCount();
		setStatus('Feedback submitted.', 'success');
		await loadFeedback(false);
	} catch (error) {
		setStatus(error.message, 'error');
	}
});

refreshButton.addEventListener('click', async () => {
	await loadFeedback();
});

list.addEventListener('click', async (event) => {
	const button = event.target.closest('.feedback-done-button');
	if (!button || button.disabled) return;

	const feedbackId = Number(button.dataset.feedbackId);
	if (!Number.isInteger(feedbackId)) return;

	try {
		const response = await fetch(`/feedback/api/items/${feedbackId}`, {
			method: 'DELETE',
			credentials: 'same-origin'
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(payload.message || 'Failed to update feedback.');
		}

		canResolveFeedback = Boolean(payload.canResolveFeedback);
		syncAccessBanner();
		setStatus('Feedback removed.', 'success');
		await loadFeedback(false);
	} catch (error) {
		setStatus(error.message, 'error');
	}
});

messageField.addEventListener('input', updateCount);

updateCount();
syncAccessBanner();
loadFeedback();
refreshTimer = setInterval(() => {
	loadFeedback(false);
}, 2000);

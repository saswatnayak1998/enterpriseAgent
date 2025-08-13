"use client";

import React, { useState } from 'react';

export default function FeedbackPage() {
	const [text, setText] = useState("");
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState("");

	async function submit() {
		setError("");
		try {
			const res = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, email })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error || 'Failed to submit');
			}
			setSent(true);
			setText("");
			setEmail("");
		} catch (e: any) {
			setError(e?.message || String(e));
		}
	}

	return (
		<div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
			<h1 style={{ marginBottom: 16 }}>Feedback</h1>
			<p style={{ color: '#888', marginBottom: 24 }}>Tell us how to improve AskAmp.</p>
			{sent && <div style={{ padding: 12, border: '1px solid #2c2', borderRadius: 8, marginBottom: 16 }}>Thanks! We received your feedback.</div>}
			{error && <div style={{ padding: 12, border: '1px solid #c22', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
			<div style={{ display: 'grid', gap: 12 }}>
				<input
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="Email (optional)"
					style={{ padding: 10, borderRadius: 8, border: '1px solid #333' }}
				/>
				<textarea
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Your feedback"
					rows={6}
					style={{ padding: 10, borderRadius: 8, border: '1px solid #333' }}
				/>
				<div>
					<button onClick={submit} style={{ padding: '10px 14px', borderRadius: 8 }}>Submit</button>
				</div>
			</div>
		</div>
	);
} 
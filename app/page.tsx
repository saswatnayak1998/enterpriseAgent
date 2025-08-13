"use client";

import React, { useEffect, useRef, useState } from 'react';

type Theme = 'dark' | 'light';

type Msg = { role: 'user' | 'assistant'; content: string; references?: { label: string; url: string }[] };

export default function Page() {
	const [messages, setMessages] = useState<Msg[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [theme, setTheme] = useState<Theme>('dark');
	const [kbOpen, setKbOpen] = useState(false);
	const [kbAnim, setKbAnim] = useState(false);
	const [kbList, setKbList] = useState<{ source: string; size: number; mtime: number }[]>([]);
	const [kbFilename, setKbFilename] = useState('note.txt');
	const [kbText, setKbText] = useState('');
	const [kbBusy, setKbBusy] = useState(false);
	const [isSmall, setIsSmall] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);
	const [stickToBottom, setStickToBottom] = useState(true);
	const prevLenRef = useRef(0);
	const bottomRef = useRef<HTMLDivElement>(null);
	const footerRef = useRef<HTMLDivElement>(null);
	const [footerHeight, setFooterHeight] = useState(160);

	useEffect(() => {
		const onResize = () => setIsSmall(window.innerWidth < 820);
		onResize();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);

	useEffect(() => {
		const RO = (window as any).ResizeObserver;
		if (!RO) return;
		const ro = new RO((entries: any) => {
			const h = entries?.[0]?.target?.getBoundingClientRect?.().height || 160;
			setFooterHeight(h + 24);
		});
		if (footerRef.current) ro.observe(footerRef.current);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const darkBg =
			'radial-gradient(1200px 600px at 100% 0%, rgba(255,179,71,0.28), rgba(0,0,0,0) 60%), ' +
			'radial-gradient(1200px 600px at 0% 100%, rgba(255,128,171,0.26), rgba(0,0,0,0) 60%), ' +
			'radial-gradient(900px 450px at 50% 30%, rgba(255,160,122,0.18), rgba(0,0,0,0) 60%), #000000';
		const lightBg =
			'radial-gradient(1200px 600px at 100% 0%, rgba(255,179,71,0.35), rgba(255,255,255,0) 60%), ' +
			'radial-gradient(1200px 600px at 0% 100%, rgba(255,128,171,0.35), rgba(255,255,255,0) 60%), #ffffff';
		document.documentElement.style.background = theme === 'dark' ? darkBg : lightBg;
		document.body.style.background = 'transparent';
		document.body.style.color = theme === 'dark' ? '#eaeaea' : '#0b0b0b';

		const style = document.createElement('style');
		style.setAttribute('data-placeholder-style', 'true');
		style.innerHTML = `
			input::placeholder{color:${theme === 'dark' ? '#7a7a7a' : '#888'};opacity:1;font-weight:${thinText.fontWeight};letter-spacing:0.1px}
			@keyframes shimmerText { 0%{ background-position:-200% 0 } 50%{ background-position:200% 0 } 100%{ background-position:-200% 0 } }
		`;
		document.querySelectorAll('style[data-placeholder-style]').forEach((n) => n.remove());
		document.head.appendChild(style);
	}, [theme]);

	// Track whether the user is near the bottom so we only auto-scroll in that case
	useEffect(() => {
		const el = listRef.current;
		if (!el) return;
		const onScroll = () => {
			const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
			setStickToBottom(distanceFromBottom < 200);
		};
		onScroll();
		el.addEventListener('scroll', onScroll);
		return () => el.removeEventListener('scroll', onScroll);
	}, []);

	const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
		const el = listRef.current;
		if (!el) return;
		el.scrollTo({ top: el.scrollHeight, behavior });
	};

	useEffect(() => {
		// Always auto-scroll when a new assistant message arrives
		if (messages.length > prevLenRef.current && messages[messages.length - 1]?.role === 'assistant') {
			requestAnimationFrame(() => scrollToBottom('smooth'));
		}
		// Otherwise only stick to bottom if user is near bottom
		else if (stickToBottom) {
			scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
		}
		prevLenRef.current = messages.length;
	}, [messages, stickToBottom]);

	async function send() {
		const text = input.trim();
		if (!text) return;
		setInput('');
		setMessages((m) => [...m, { role: 'user', content: text }]);
		setStickToBottom(true);
		requestAnimationFrame(() => scrollToBottom('auto'));
		setLoading(true);
		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: text, history: messages })
			});
			const data = await res.json();
			if (data?.error) {
				setMessages((m) => [...m, { role: 'assistant', content: `Error: ${data.error}` }]);
			} else {
				setMessages((m) => [
					...m,
					{
						role: 'assistant',
						content: data.answer ?? 'No answer',
						references: (data.references as { label: string; url: string }[]) || []
					}
				]);
			}
		} catch (e: any) {
			setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e?.message || e}` }]);
		} finally {
			setLoading(false);
		}
	}

	const textColorMuted = theme === 'dark' ? '#a1a1a1' : '#666';
	const borderColor = theme === 'dark' ? '#222' : '#eee';
	const surface = theme === 'dark' ? '#0a0a0a' : '#fff';
	const primary = theme === 'dark' ? '#eaeaea' : '#fff';
	const primaryText = theme === 'dark' ? '#000' : '#000';
	const shadow = theme === 'dark' ? '0 12px 30px rgba(0,0,0,0.35)' : '0 12px 30px rgba(0,0,0,0.06)';
	// Modal-specific styling (theme-aware)
	const modalBg = theme === 'dark' ? 'rgba(18,18,18,0.95)' : '#ffffff';
	const modalText = theme === 'dark' ? '#eaeaea' : '#0b0b0b';
	const panelBg = theme === 'dark' ? '#0c0c0c' : '#fafafa';
	const panelBorderColor = theme === 'dark' ? '#333' : '#e5e7eb';
	const inputBg = theme === 'dark' ? '#111' : '#ffffff';
	const rowBg = theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff';
	// Tile button (trash) styling
	const tileBg = theme === 'dark' ? '#141414' : '#f1f2f5';
	const tileBorder = theme === 'dark' ? '#262626' : '#e6e8ee';
	const tileShadow = theme === 'dark'
		? '0 6px 12px rgba(0,0,0,0.55), inset 0 1px rgba(255,255,255,0.05)'
		: '0 6px 12px rgba(0,0,0,0.12), inset 0 1px rgba(255,255,255,0.9)';

	// Theme-aware styles for reference tiles (Sources)
	const refTileBg = theme === 'dark' ? '#0f0f0f' : '#f6f7f9';
	const refTileBorder = theme === 'dark' ? '#333' : '#e5e7eb';

	// Shared thin Roboto text style for buttons/labels
	const thinText: React.CSSProperties = { fontFamily: 'inherit', fontWeight: 300 };

	const isDark = theme === 'dark';
	const shimmerStyle: React.CSSProperties = {
		background: 'linear-gradient(90deg, rgba(255,179,107,0.85), rgba(255,151,208,0.95), rgba(255,179,107,0.85))',
		backgroundSize: '200% 100%',
		WebkitBackgroundClip: 'text',
		backgroundClip: 'text',
		color: 'transparent',
		animation: 'shimmerText 9s linear infinite'
	};

	return (
		<div style={{ minHeight: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto', alignItems: 'start' }}>
			{/* Header */}
			<nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', maxWidth: 1120, margin: '0 auto', width: '100%' }}>
				<div style={{ fontWeight: 100, letterSpacing: 0.2 }}>AskAmp</div>
				<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
					{/* Single theme toggle switch */}
					<button
						role="switch"
						aria-checked={isDark}
						onClick={() => setTheme(isDark ? 'light' : 'dark')}
						style={{ width: 50, height: 28, borderRadius: 999, border: `1px solid ${borderColor}`, background: isDark ? '#111' : '#f3f3f3', position: 'relative', padding: 0, cursor: 'pointer' }}
						title="Toggle theme"
					>
						<span style={{ position: 'absolute', top: 1.5, left: isDark ? 24 : 2, width: 24, height: 24, borderRadius: '50%', background: isDark ? '#eaeaea' : '#0b0b0b', transition: 'left 200ms ease' }} />
					</button>
					{/* Feedback link removed */}
					<button onClick={openKbModal} style={{ padding: '10px 14px', borderRadius: 999, border: 'none', background: 'linear-gradient(90deg,#ffb36b,#ff97d0)', color: '#111', ...thinText }}>Docs</button>
				</div>
			</nav>

			{/* Messages above input (scrollable) */}
			<main ref={listRef} style={{ maxWidth: 920, margin: '0 auto', width: '100%', padding: `0 16px ${footerHeight}px`, overflowY: 'auto' }}>
				<section style={{ textAlign: 'center', padding: '24px 12px 24px' }}>
					<div style={{ fontSize: 20, fontWeight: 100, marginBottom: 8, color: textColorMuted }}>AskAmp</div>
					<h1 style={{ margin: '0 auto', maxWidth: 560, fontSize: 50, lineHeight: 1.08, fontWeight: 300, ...shimmerStyle }}>Search across docs</h1>
				</section>

				{messages.map((m, i) => (
					<div key={i} style={{ margin: '0 auto', maxWidth: 820, background: 'transparent', borderRadius: 12, padding: '8px 0' }}>
						<div style={{ fontSize: 12, color: textColorMuted, marginBottom: 6 }}>{m.role}</div>
						<div style={{ whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.6 }}>{m.content}</div>
						{m.role === 'assistant' && m.references && m.references.length > 0 && (
							<div style={{ marginTop: 12 }}>
								<div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8, fontWeight: 300 }}>Sources</div>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
									{m.references.map((ref, idx) => {
										const display = ref.label.replace(/^#\d+\s+/, '');
										const thumbBase = process.env.NEXT_PUBLIC_RETRIEVER_URL || '';
										const thumb = thumbBase
											? `${thumbBase}/thumb?source=${encodeURIComponent(display)}&text=${encodeURIComponent((m.content || '').slice(0, 240))}`
											: '';
										return (
											<a key={idx} href={ref.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
												<div style={{ border: `1px solid ${refTileBorder}`, borderRadius: 12, overflow: 'hidden', background: refTileBg }}>
													{thumb && (
														<div style={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
															<img src={thumb} alt={display} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
														</div>
													)}
													<div style={{ padding: 8, fontSize: 13, fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{display}</div>
												</div>
											</a>
										);
									})}
								</div>
							</div>
						)}
					</div>
				))}
				{loading && <div style={{ color: textColorMuted, padding: '8px 0' }}>Thinking…</div>}
				<div ref={bottomRef} style={{ height: footerHeight + 40 }} />
			</main>

			{/* Bottom-fixed input */}
			<footer ref={footerRef} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: 12 }}>
				<div style={{ display: 'grid', placeItems: 'center' }}>
					<div style={{ width: 'min(920px, 92vw)', background: surface, borderRadius: 20, boxShadow: shadow, border: `1px solid ${borderColor}` }}>
						<div style={{ position: 'relative', padding: 10 }}>
							<input
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!loading) send(); } }}
								placeholder="What do you want to search for?"
								style={{ width: '100%', height: 48, padding: '0 104px 0 16px', border: 'none', outline: 'none', background: 'transparent', color: 'inherit', fontSize: 18, borderRadius: 20, ...thinText }}
							/>
							<button aria-label="Send" onClick={send} disabled={loading} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 42, height: 42, background: '#ffffff', color: '#111', borderRadius: '50%', display: 'grid', placeItems: 'center', border: '1px solid rgba(0,0,0,0.12)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', transition: 'transform 120ms ease, box-shadow 120ms ease' }}>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M12 5l5 5h-3v8H10v-8H7l5-5z" fill="currentColor"/>
								</svg>
							</button>
						</div>
					</div>
				</div>
			</footer>

			{/* KB modal */}
			{kbOpen && (
				<div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', opacity: kbAnim ? 1 : 0, transition: 'opacity 220ms ease' }} onClick={closeKbModal}>
					<div onClick={(e) => e.stopPropagation()} style={{ width: isSmall ? '96vw' : '92vw', maxWidth: 1200, maxHeight: isSmall ? '90vh' : '82vh', margin: isSmall ? '5vh auto' : '9vh auto', background: modalBg, color: modalText, border: `1px solid ${panelBorderColor}`, borderRadius: 16, padding: isSmall ? 12 : 20, boxShadow: '0 30px 80px rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden', transform: kbAnim ? 'translateY(0px)' : 'translateY(10px)', transition: 'transform 220ms ease' }}>
						<h3 style={{ marginTop: 0, fontWeight:100 }}>Knowledge Base: Confluence Docs</h3>
						<div style={{ display: 'grid', gridTemplateColumns: isSmall ? '1fr' : '1.1fr 0.9fr', gap: 18, flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 80 }}>
							<div style={{ background: panelBg, border: `1px solid ${panelBorderColor}`, borderRadius: 14, padding: 14, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', overflow: 'visible' }}>
								<h4 style={{ margin: '0 0 8px', fontWeight: 100, letterSpacing: 0.2 }}>Add / Edit</h4>
								<div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
									<input value={kbFilename} onChange={(e) => setKbFilename(e.target.value)} placeholder="Filename (e.g. note.txt)" style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${panelBorderColor}`, background: inputBg, color: modalText, marginBottom: 10, boxSizing: 'border-box' }} />
									<textarea value={kbText} onChange={(e) => setKbText(e.target.value)} placeholder="Paste or edit text here" rows={10} style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${panelBorderColor}`, background: inputBg, color: modalText, fontFamily: 'inherit', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', resize: 'vertical', boxSizing: 'border-box' }} />
								</div>
							</div>
							<div style={{ background: panelBg, border: `1px solid ${panelBorderColor}`, borderRadius: 14, padding: 14, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'visible' }}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
									<h4 style={{ margin: 0, fontWeight: 100, letterSpacing: 0.2 }}>Documents</h4>
									<button onClick={refreshKb} style={{ padding: '8px 12px', borderRadius: 999, border: 'none', background: 'linear-gradient(90deg,#ffb36b,#ff97d0)', color: '#111', ...thinText }}>Refresh</button>
								</div>
								<div style={{ flex: 1, minHeight: 0, overflow: 'visible' }}>
									{kbList.map((it) => (
										<div
											key={it.source}
											onClick={() => openKb(it.source)}
											style={{
												display: 'grid',
												gridTemplateColumns: 'minmax(0,1fr) auto',
												gap: 10,
												alignItems: 'center',
												padding: '10px 12px',
												border: `1px solid ${panelBorderColor}`,
												borderRadius: 12,
												margin: '8px 0',
												background: rowBg,
												boxSizing: 'border-box',
												cursor: 'pointer'
											}}
										>
											<span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 300 }}>{it.source}</span>
											<button
												aria-label="Delete"
												onClick={(e) => { e.stopPropagation(); deleteKb(it.source); }}
												style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${tileBorder}`, background: tileBg, color: 'inherit', display: 'grid', placeItems: 'center', boxShadow: tileShadow }}
											>
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
													<path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
													<path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
													<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
													<path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
												</svg>
											</button>
										</div>
									))}
									{kbList.length === 0 && <div style={{ padding: 14, color: textColorMuted, fontWeight: 300 }}>No documents</div>}
								</div>
							</div>
						</div>
						<div style={{ marginTop: 14, position: 'sticky', bottom: 0, background: modalBg, borderTop: `1px solid ${panelBorderColor}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
							<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
								<button onClick={saveTextToKb} disabled={kbBusy || !kbFilename || !kbText} style={{ padding: '10px 14px', borderRadius: 999, border: 'none', background: 'linear-gradient(90deg,#ffb36b,#ff97d0)', color: '#111', ...thinText }}>{kbBusy ? 'Saving…' : 'Save & Reindex'}</button>
								<label htmlFor="kbUpload" style={{ padding: '10px 14px', borderRadius: 999, border: `1px solid ${panelBorderColor}`, cursor: 'pointer', background: 'transparent', color: modalText, ...thinText }}>Upload file</label>
								<input id="kbUpload" onChange={uploadFileToKb} type="file" accept=".txt,.md" style={{ display: 'none' }} />
							</div>
							<button onClick={closeKbModal} style={{ padding: '10px 14px', borderRadius: 999, border: 'none', background: 'linear-gradient(90deg,#ffb36b,#ff97d0)', color: '#111', ...thinText }}>Close</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);

	async function refreshKb() {
		try {
			const base = process.env.NEXT_PUBLIC_RETRIEVER_URL || process.env.RETRIEVER_URL || 'http://127.0.0.1:8000';
			const res = await fetch(`${base}/list`);
			const data = await res.json();
			setKbList((data?.items as any[]) || []);
		} catch {}
	}

	async function saveTextToKb() {
		if (!kbFilename || !kbText) return;
		try {
			const base = process.env.NEXT_PUBLIC_RETRIEVER_URL || process.env.RETRIEVER_URL || 'http://127.0.0.1:8000';
			const form = new FormData();
			form.append('filename', kbFilename);
			form.append('text', kbText);
			form.append('reindex', 'true');
			setKbBusy(true);
			await fetch(`${base}/add_text`, { method: 'POST', body: form });
			setKbBusy(false);
			setKbText('');
			await refreshKb();
		} catch {}
	}

	async function deleteKb(source: string) {
		try {
			const base = process.env.NEXT_PUBLIC_RETRIEVER_URL || process.env.RETRIEVER_URL || 'http://127.0.0.1:8000';
			await fetch(`${base}/delete?source=${encodeURIComponent(source)}&reindex=true`, { method: 'DELETE' });
			await refreshKb();
		} catch {}
	}

	async function openKb(source: string) {
		try {
			const base = process.env.NEXT_PUBLIC_RETRIEVER_URL || process.env.RETRIEVER_URL || 'http://127.0.0.1:8000';
			const res = await fetch(`${base}/raw?source=${encodeURIComponent(source)}`);
			const txt = await res.text();
			setKbFilename(source);
			setKbText(txt);
		} catch {}
	}

	async function uploadFileToKb(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const base = process.env.NEXT_PUBLIC_RETRIEVER_URL || process.env.RETRIEVER_URL || 'http://127.0.0.1:8000';
			const form = new FormData();
			form.append('file', file);
			form.append('reindex', 'true');
			await fetch(`${base}/add_file`, { method: 'POST', body: form });
			(await refreshKb());
		} catch {}
	}

	function openKbModal() {
		setKbOpen(true);
		void refreshKb();
		requestAnimationFrame(() => setKbAnim(true));
	}

	function closeKbModal() {
		setKbAnim(false);
		setTimeout(() => setKbOpen(false), 220);
	}
} 
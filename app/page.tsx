"use client";

import React, { useEffect, useRef, useState } from 'react';

type Theme = 'dark' | 'light';

type Msg = { role: 'user' | 'assistant'; content: string; references?: { label: string; url: string; snippet?: string }[] };

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
	const headerRef = useRef<HTMLDivElement>(null);
	const [headerHeight, setHeaderHeight] = useState(0);
	// Sidebar state and selection persistence
	const [sideOpen, setSideOpen] = useState(true);
	const [followLatest, setFollowLatest] = useState(true);
	const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const onResize = () => setIsSmall(window.innerWidth < 820);
		onResize();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);

	// Load persisted state
	useEffect(() => {
		try {
			const raw = localStorage.getItem('askamp_chat_v1');
			if (!raw) { setHydrated(true); return; }
			const parsed = JSON.parse(raw || '{}');
			if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
			if (parsed.theme === 'dark' || parsed.theme === 'light') setTheme(parsed.theme);
			if (typeof parsed.sideOpen === 'boolean') setSideOpen(parsed.sideOpen);
			if (typeof parsed.followLatest === 'boolean') setFollowLatest(parsed.followLatest);
			if (typeof parsed.selectedTurn === 'number' || parsed.selectedTurn === null) setSelectedTurn(parsed.selectedTurn);
		} catch {}
		setHydrated(true);
	}, []);

	// Persist state on changes
	useEffect(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(
				'askamp_chat_v1',
				JSON.stringify({ messages, theme, sideOpen, followLatest, selectedTurn })
			);
		} catch {}
	}, [messages, theme, sideOpen, followLatest, selectedTurn, hydrated]);

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
		const RO = (window as any).ResizeObserver;
		if (!RO) return;
		const ro = new RO((entries: any) => {
			const h = entries?.[0]?.target?.getBoundingClientRect?.().height || 64;
			setHeaderHeight(h);
		});
		if (headerRef.current) ro.observe(headerRef.current);
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
		if (bottomRef.current) {
			bottomRef.current.scrollIntoView({ behavior, block: 'end' });
			return;
		}
		const el = listRef.current;
		if (el) el.scrollTo({ top: el.scrollHeight, behavior });
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
						references: (data.references as { label: string; url: string; snippet?: string }[]) || []
					}
				]);
				// If following latest, auto-select new turn
				if (followLatest) setSelectedTurn(null);
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

	// Header (top bar)
	const headerBg = theme === 'dark' ? 'rgba(10,10,10,0.75)' : 'rgba(255,255,255,0.9)';
	const headerBorder = theme === 'dark' ? '#1b1b1b' : '#ececec';

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
	const shimmerGoldStyle: React.CSSProperties = {
		background: 'linear-gradient(90deg, rgba(255,222,173,0.92), rgba(255,245,210,0.9), rgba(255,222,173,0.92))',
		backgroundSize: '200% 100%',
		WebkitBackgroundClip: 'text',
		backgroundClip: 'text',
		color: 'transparent',
		animation: 'shimmerText 9s linear infinite'
	};

	// Minimal Markdown renderer (bold, italics, lists, paragraphs)
	function renderInline(text: string): React.ReactNode[] {
		const nodes: React.ReactNode[] = [];
		let last = 0;
		const re = /\*\*(.*?)\*\*|__(.*?)__|\*(.*?)\*|_(.*?)_/g;
		let m: RegExpExecArray | null;
		let key = 0;
		while ((m = re.exec(text)) !== null) {
			if (m.index > last) nodes.push(text.slice(last, m.index));
			const content = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
			if (m[1] || m[2]) nodes.push(<strong key={`b-${key++}`}>{content}</strong>);
			else nodes.push(<em key={`i-${key++}`}>{content}</em>);
			last = m.index + m[0].length;
		}
		if (last < text.length) nodes.push(text.slice(last));
		return nodes;
	}

	function renderMarkdown(md: string): React.ReactNode {
		const lines = (md || '').replace(/\r/g, '').split('\n');
		const blocks: React.ReactNode[] = [];
		let i = 0;
		let blockKey = 0;
		const isUl = (s: string) => /^\s*[-*+]\s+/.test(s);
		const isOl = (s: string) => /^\s*\d+\.\s+/.test(s);
		const isTableLine = (s: string) => /^\s*\|.*\|\s*$/.test(s);
		const isHr = (s: string) => /^\s*([-*_])\1\1+\s*$/.test(s);
		const isHeading = (s: string) => /^\s{0,3}#{1,3}\s+/.test(s);
		while (i < lines.length) {
			if (/^\s*$/.test(lines[i])) { i++; continue; }
			if (isHr(lines[i])) { blocks.push(<div key={`hr-${blockKey++}`} style={{ borderTop: `1px solid ${theme === 'dark' ? '#1f1f1f' : '#e5e7eb'}`, margin: '14px 0' }} />); i++; continue; }
			if (isHeading(lines[i])) {
				const m = lines[i].match(/^(\s{0,3})(#{1,3})\s+(.*)$/)!;
				const level = m[2].length; const text = m[3].trim(); i++;
				const common = { margin: '10px 0 6px', fontWeight: 300 } as React.CSSProperties;
				if (level === 1) blocks.push(<h1 key={`h-${blockKey++}`} style={{ ...common, fontSize: 28 }}>{renderInline(text)}</h1>);
				else if (level === 2) blocks.push(<h2 key={`h-${blockKey++}`} style={{ ...common, fontSize: 22 }}>{renderInline(text)}</h2>);
				else blocks.push(<h3 key={`h-${blockKey++}`} style={{ ...common, fontSize: 18 }}>{renderInline(text)}</h3>);
				continue;
			}
			if (isTableLine(lines[i])) {
				const tbl: string[] = [];
				while (i < lines.length && isTableLine(lines[i])) { tbl.push(lines[i]); i++; }
				blocks.push(
					<div key={`tbl-${blockKey++}`} style={{ margin: '10px 0' }}>
						{(() => {
							const border = theme === 'dark' ? '#2a2a2a' : '#e5e7eb';
							const rows = tbl.map((l) => l.trim()).filter((l) => /^\|.*\|$/.test(l)).map((l) => l.replace(/^\||\|$/g, ''));
							const cells = rows.map((r) => r.split('|').map((c) => c.trim()));
							let header: string[] | null = null; let startIdx = 0;
							if (cells.length >= 2 && /^[-:\s\|]+$/.test(rows[1])) { header = cells[0]; startIdx = 2; }
							return (
								<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
									{header && (
										<thead><tr>{header.map((h, i) => (<th key={i} style={{ textAlign: 'left', border: `1px solid ${border}`, padding: '6px 8px', fontWeight: 500 }}>{h}</th>))}</tr></thead>
									)}
									<tbody>
										{cells.slice(startIdx).map((row, ri) => (
											<tr key={ri}>{row.map((c, ci) => (<td key={ci} style={{ border: `1px solid ${border}`, padding: '6px 8px', verticalAlign: 'top' }}>{renderInline(c)}</td>))}</tr>
										))}
									</tbody>
								</table>
							);
						})()}
					</div>
				);
				continue;
			}
			if (isUl(lines[i])) {
				const items: React.ReactNode[] = [];
				while (i < lines.length && isUl(lines[i])) {
					items.push(<li key={`li-${items.length}`}>{renderInline(lines[i].replace(/^\s*[-*+]\s+/, ''))}</li>);
					i++;
				}
				blocks.push(<ul key={`ul-${blockKey++}`} style={{ margin: '8px 0 8px 20px' }}>{items}</ul>);
				continue;
			}
			if (isOl(lines[i])) {
				const items: React.ReactNode[] = [];
				while (i < lines.length && isOl(lines[i])) {
					items.push(<li key={`li-${items.length}`}>{renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>);
					i++;
				}
				blocks.push(<ol key={`ol-${blockKey++}`} style={{ margin: '8px 0 8px 20px' }}>{items}</ol>);
				continue;
			}
			const para: string[] = [];
			while (i < lines.length && !/^\s*$/.test(lines[i]) && !isUl(lines[i]) && !isOl(lines[i]) && !isTableLine(lines[i]) && !isHeading(lines[i]) && !isHr(lines[i])) {
				para.push(lines[i]);
				i++;
			}
			const text = para.join(' ').trim();
			if (text) blocks.push(<p key={`p-${blockKey++}`} style={{ margin: '10px 0' }}>{renderInline(text)}</p>);
		}
		return <>{blocks}</>;
	}

	// Right panel data
	const assistantTurns = messages.map((m, i) => ({ m, i })).filter((x) => x.m.role === 'assistant' && x.m.references && x.m.references.length > 0);
	const effectiveTurnIndex = followLatest ? (assistantTurns.length ? assistantTurns[assistantTurns.length - 1].i : null) : (selectedTurn ?? (assistantTurns.length ? assistantTurns[assistantTurns.length - 1].i : null));
	const sideRefs = effectiveTurnIndex != null ? (messages[effectiveTurnIndex].references || []) : [];
	const turnOptions = assistantTurns.map(({ i }) => {
		let q = '';
		for (let j = i - 1; j >= 0; j--) { if (messages[j].role === 'user') { q = messages[j].content; break; } }
		const label = (q || 'Question').replace(/\s+/g, ' ').slice(0, 60) + (q.length > 60 ? '…' : '');
		return { i, label };
	});
	const rightPanelW = 340;
	const mainMaxWidth = !isSmall && sideOpen && (sideRefs.length > 0 || turnOptions.length > 0) ? `min(920px, calc(100vw - ${rightPanelW + 48}px))` : 920;

	return (
		<div style={{ height: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr auto', alignItems: 'start', overflow: 'hidden' }}>
			{/* Header */}
			<nav ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100, backdropFilter: 'saturate(180%) blur(10px)', background: headerBg, borderBottom: `1px solid ${headerBorder}`, boxSizing: 'border-box' }}>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						padding: isSmall ? '10px 14px' : '12px 24px',
						paddingLeft: `calc(${isSmall ? 14 : 24}px + env(safe-area-inset-left))`,
						paddingRight: `calc(${isSmall ? 14 : 24}px + env(safe-area-inset-right))`,
						maxWidth: 1120,
						margin: '0 auto',
						width: '100%',
						boxSizing: 'border-box',
						minWidth: 0
					}}
				>
					<div style={{ fontWeight: 100, letterSpacing: 0.2, minWidth: 0 }}>AskAmp</div>
					<div style={{ display: 'flex', gap: isSmall ? 8 : 16, alignItems: 'center', minWidth: 0 }}>
						{/* Single theme toggle switch */}
						<button
							role="switch"
							aria-checked={isDark}
							onClick={() => setTheme(isDark ? 'light' : 'dark')}
							style={{ width: 50, height: 28, borderRadius: 999, border: `1px solid ${borderColor}`, background: isDark ? '#111' : '#f3f3f3', position: 'relative', padding: 0, cursor: 'pointer', flexShrink: 0 }}
							title="Toggle theme"
						>
							<span style={{ position: 'absolute', top: 1.5, left: isDark ? 24 : 2, width: 24, height: 24, borderRadius: '50%', background: isDark ? '#eaeaea' : '#0b0b0b', transition: 'left 200ms ease' }} />
						</button>
						{/* Feedback link removed */}
						<button onClick={openKbModal} style={{ padding: isSmall ? '7px 10px' : '10px 14px', fontSize: isSmall ? 12 : 14, borderRadius: 999, border: 'none', background: 'linear-gradient(90deg,#ffb36b,#ff97d0)', color: '#111', ...thinText, maxWidth: isSmall ? '44vw' : undefined, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>Docs</button>
					</div>
				</div>
			</nav>

			{/* Messages above input (scrollable) */}
			<main ref={listRef as any} style={{ position: 'fixed', top: headerHeight + 12, left: 0, right: (!isSmall && sideOpen && (sideRefs.length > 0 || turnOptions.length > 0)) ? rightPanelW + 32 : 0, bottom: footerHeight + 24, overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
			<div style={{ maxWidth: mainMaxWidth as any, margin: '0 auto', width: '100%', padding: '0 16px' }}>
			<section style={{ textAlign: 'center', padding: '24px 12px 24px' }}>
					<div style={{ fontSize: 20, fontWeight: 100, marginBottom: 8, color: textColorMuted }}>AskAmp</div>
					<h1 style={{ margin: '0 auto', maxWidth: 560, fontSize: 50, lineHeight: 1.08, fontWeight: 300, ...shimmerStyle }}>Search across Confluence Docs</h1>

				</section>

				{messages.map((m, i) => (
					<div key={i} style={{ margin: '0 auto', maxWidth: 820, background: 'transparent', borderRadius: 12, padding: '10px 0' }}>
						{m.role === 'user' && <div style={{ fontSize: 12, color: textColorMuted, marginBottom: 6 }}>you</div>}
						{m.role === 'assistant' ? (
							<div style={{ fontSize: 18, lineHeight: 1.7, fontWeight: 300 }}>{renderMarkdown(m.content)}</div>
						) : (
							<div style={{ whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.7, ...shimmerGoldStyle }}>{m.content}</div>
						)}
					</div>
				))}
				{loading && <div style={{ color: textColorMuted, padding: '8px 0' }}>Thinking…</div>}
				<div ref={bottomRef} style={{ height: footerHeight + 120 }} />
			</div>
			</main>

			{/* Right-side Sources panel (desktop only) */}
			{!isSmall && sideOpen && (
				<aside
					style={{
						position: 'fixed',
						top: headerHeight + 12,
						right: 16,
						bottom: 16,
						width: rightPanelW,
						background: surface,
						border: `1px solid ${borderColor}`,
						borderRadius: 12,
						boxShadow: shadow,
						padding: 10,
						boxSizing: 'border-box',
						overflowY: 'auto',
						WebkitOverflowScrolling: 'touch',
						overflowX: 'hidden',
						overscrollBehavior: 'contain'
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
						<div style={{ fontSize: 13, opacity: 0.8, fontWeight: 300 }}>Sources</div>
						<button aria-label="Close" onClick={() => setSideOpen(false)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${borderColor}`, background: 'transparent', color: 'inherit', cursor: 'pointer' }}>×</button>
					</div>
					{assistantTurns.length > 0 && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
							<select value={effectiveTurnIndex ?? ''} onChange={(e) => { setSelectedTurn(Number(e.target.value)); setFollowLatest(false); }} style={{ flex: 1, background: 'transparent', color: 'inherit', border: `1px solid ${borderColor}`, borderRadius: 8, padding: '6px 8px', fontSize: 12 }}>
								{turnOptions.map((opt) => (
									<option key={opt.i} value={opt.i} style={{ color: '#000' }}>{opt.label}</option>
								))}
							</select>
							<label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, opacity: 0.8 }}>
								<input type="checkbox" checked={followLatest} onChange={(e) => setFollowLatest(e.target.checked)} />
								<span>Follow latest</span>
							</label>
						</div>
					)}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{(sideRefs || []).map((ref, idx) => {
							const display = ref.label.replace(/^#\d+\s+/, '');
							return (
								<a key={idx} href={ref.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
									<div style={{ border: `1px solid ${refTileBorder}`, borderRadius: 10, background: refTileBg, padding: '8px 10px', fontSize: 12, fontWeight: 300 }}>
										<div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{display}</div>
										{ref.snippet && (
											<div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, display: '-webkit-box', WebkitLineClamp: 4 as any, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', lineHeight: 1.4 }}>{ref.snippet}</div>
										)}
									</div>
								</a>
							);
						})}
						{(sideRefs || []).length === 0 && <div style={{ fontSize: 12, opacity: 0.7 }}>No sources</div>}
					</div>
				</aside>
			)}
			{/* Reopen button for sidebar */}
			{!isSmall && !sideOpen && (
				<button onClick={() => setSideOpen(true)} style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1200, padding: '10px 12px', borderRadius: 999, border: `1px solid ${borderColor}`, background: surface, color: 'inherit', boxShadow: shadow, ...thinText }}>Sources</button>
			)}

			{/* Bottom-fixed input */}
			<footer
				ref={footerRef}
				style={{
					position: 'fixed',
					left: 0,
					right: 0,
					bottom: 0,
					zIndex: 1000,
					padding: '12px 12px calc(12px + env(safe-area-inset-bottom)) 12px'
				}}
			>
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
				<div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', opacity: kbAnim ? 1 : 0, transition: 'opacity 220ms ease', zIndex: 2000 }} onClick={closeKbModal}>
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
						<div style={{ marginTop: 14, position: 'sticky', bottom: 0, background: modalBg, borderTop: `1px solid ${panelBorderColor}`, paddingTop: 10, paddingBottom: 'calc(8px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
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
			const res = await fetch(`/api/retriever/list`);
			const data = await res.json();
			setKbList((data?.items as any[]) || []);
		} catch {}
	}

	async function saveTextToKb() {
		if (!kbFilename || !kbText) return;
		try {
			const form = new FormData();
			form.append('filename', kbFilename);
			form.append('text', kbText);
			form.append('reindex', 'true');
			setKbBusy(true);
			await fetch(`/api/retriever/add_text`, { method: 'POST', body: form });
			setKbBusy(false);
			setKbText('');
			await refreshKb();
		} catch {}
	}

	async function deleteKb(source: string) {
		try {
			await fetch(`/api/retriever/delete?source=${encodeURIComponent(source)}&reindex=true`, { method: 'DELETE' });
			await refreshKb();
		} catch {}
	}

	async function openKb(source: string) {
		try {
			const res = await fetch(`/api/retriever/raw?source=${encodeURIComponent(source)}`);
			const txt = await res.text();
			setKbFilename(source);
			setKbText(txt);
		} catch {}
	}

	async function uploadFileToKb(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const form = new FormData();
			form.append('file', file);
			form.append('reindex', 'true');
			await fetch(`/api/retriever/add_file`, { method: 'POST', body: form });
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
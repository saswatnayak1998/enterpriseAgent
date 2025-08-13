import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
	query: z.string().min(1),
	history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional()
});

type RetrieverResult = { source: string; text: string };

type Reference = { label: string; url: string };

const SYSTEM_PROMPT =
	"You are an LLM developed by Amperesand (by Saswat). You will be fed data from documents. " +
	"Do not copy-paste content from the docs; instead, make sense of it and answer the user's query clearly and concisely. " +
	"If the provided context is insufficient, say you don't know. When available, include brief citations.";

async function fetchContext(query: string, topK: number): Promise<RetrieverResult[]> {
	const base = process.env.RETRIEVER_URL;
	if (!base) return [];
	try {
		const res = await fetch(`${base}/search_meta`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query, top_k: topK })
		});
		if (!res.ok) return [];
		const data = await res.json();
		return (data?.results as RetrieverResult[]) || [];
	} catch {
		return [];
	}
}

export async function POST(req: NextRequest) {
	const json = await req.json();
	const parsed = BodySchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
	}
	const { query } = parsed.data;

	const apiKey = process.env.NIM_API_KEY;
	const base = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
	const model = process.env.NIM_MODEL || 'openai/gpt-oss-20b';
	if (!apiKey) {
		return NextResponse.json({ error: 'Missing NIM_API_KEY' }, { status: 401 });
	}

	const topK = Number(process.env.TOP_K || '4');
	const items = await fetchContext(query, topK);
	const contextBlocks = items.map((it, i) => `[#${i + 1}] Source: ${it.source}\n${it.text}`);
	const contextPrefix = items.length
		? `Use ONLY the following context to answer. If insufficient, say you don't know.\n\n${contextBlocks.join('\n\n')}\n\nQuestion: ${query}`
		: query;

	const payload = {
		model,
		messages: [
			{ role: 'system', content: SYSTEM_PROMPT },
			{ role: 'user', content: contextPrefix }
		],
		temperature: 0.5,
		top_p: 1,
		max_tokens: 1024
	};

	try {
		const upstream = await fetch(`${base}/chat/completions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		const text = await upstream.text();
		let data: any;
		try {
			data = JSON.parse(text);
		} catch {
			return NextResponse.json({ error: `Upstream returned non-JSON: ${text.slice(0, 200)}` }, { status: upstream.status || 502 });
		}

		if (!upstream.ok) {
			return NextResponse.json({ error: data?.error || data?.message || 'Upstream error' }, { status: upstream.status });
		}

		const answer = data?.choices?.[0]?.message?.content ?? '';
		const references: Reference[] = items.map((it, i) => ({
			label: `#${i + 1} ${it.source}`,
			url: `${process.env.RETRIEVER_URL}/raw?source=${encodeURIComponent(it.source)}`
		}));

		return NextResponse.json({ answer, usedRag: items.length > 0, chunks: items, references });
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || 'Request failed' }, { status: 500 });
	}
} 
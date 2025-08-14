import { NextRequest } from 'next/server';

function buildTargetUrl(req: NextRequest, path: string[]): string {
	const base = process.env.RETRIEVER_URL;
	if (!base) throw new Error('Missing RETRIEVER_URL');
	const qs = req.nextUrl.search || '';
	return `${base}/${path.join('/')}${qs}`;
}

async function forward(req: NextRequest, path: string[], init?: RequestInit) {
	const url = buildTargetUrl(req, path);
	const headers = new Headers(req.headers);
	headers.delete('host');
	headers.delete('x-forwarded-host');
	headers.delete('x-forwarded-proto');
	return fetch(url, {
		method: req.method,
		headers,
		body: req.body as any,
		redirect: 'manual',
		...init
	});
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
	try {
		const res = await forward(req, params.path);
		return new Response(res.body, { status: res.status, headers: res.headers });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e?.message || 'Proxy failed' }), { status: 502 });
	}
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
	try {
		const res = await forward(req, params.path);
		return new Response(res.body, { status: res.status, headers: res.headers });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e?.message || 'Proxy failed' }), { status: 502 });
	}
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
	try {
		const res = await forward(req, params.path);
		return new Response(res.body, { status: res.status, headers: res.headers });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e?.message || 'Proxy failed' }), { status: 502 });
	}
} 
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { text = '', email = '' } = body || {};
		if (!text || typeof text !== 'string') {
			return NextResponse.json({ error: 'Feedback text is required' }, { status: 400 });
		}
		// For demo: log to server console. Replace with DB/email as needed.
		console.log('[FEEDBACK]', { email, text });
		return NextResponse.json({ ok: true });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
	}
} 
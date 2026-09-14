import { NextRequest, NextResponse } from 'next/server';
import { clientIp, turnstileOk } from '@/lib/turnstileVerify';

// Every value lands in an HTML email, so it is escaped: unescaped, a visitor
// could put links or markup of their choosing into the owner's inbox.
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function POST(req: NextRequest) {
  const { name, email, message, turnstile_token } = await req.json();

  // Checked first, before anything else about the request. The WAF rate limit
  // shares one Hobby rule with the LLM routes (20/min per IP), which is loose
  // for a form that sends email; Turnstile is what keeps scripts out.
  if (!(await turnstileOk(turnstile_token, clientIp(req.headers), 'contact'))) {
    return NextResponse.json({ error: 'Failed verification.' }, { status: 403 });
  }

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;

  if (key) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AIRaML Contact <onboarding@resend.dev>',
        to: 'ramleo84@gmail.com',
        subject: `New message from ${String(name).slice(0, 100)}`,
        html: `<p><strong>From:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p><p><strong>Message:</strong></p><p>${esc(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to send. Try emailing directly.' }, { status: 500 });
    }
  } else {
    console.log('[contact]', { name, email, message });
  }

  return NextResponse.json({ success: true });
}

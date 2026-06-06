import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { name, email, message } = await req.json();

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
        subject: `New message from ${name}`,
        html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
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

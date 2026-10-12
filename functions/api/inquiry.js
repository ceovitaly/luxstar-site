// Cloudflare Pages Function: POST /api/inquiry
const text = (value, limit = 2000) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const respond = (message, status) => new Response(JSON.stringify({ message }), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    console.error('Missing email configuration');
    return respond('Mail service is not configured', 503);
  }

  if ((request.headers.get('content-type') || '').split(';')[0].trim() !== 'application/json') {
    return respond('Expected JSON', 415);
  }

  const length = Number(request.headers.get('content-length') || 0);
  if (length > 12000) return respond('Payload too large', 413);

  let data;
  try { data = await request.json(); } catch { return respond('Invalid JSON', 400); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return respond('Invalid data', 400);
  if (JSON.stringify(data).length > 12000) return respond('Payload too large', 413);

  // Hidden field for basic bot filtering (if included by client).
  if (text(data.website)) return respond('Accepted', 200);

  const name = text(data.name, 200);
  const contactInfo = text(data.contactInfo, 300);
  const task = text(data.task, 100);
  const budget = text(data.budget, 100);
  const details = text(data.details, 4000);
  if (!name || !contactInfo || !details || name.length > 200 || contactInfo.length > 300 || details.length > 4000) {
    return respond('Required fields missing', 400);
  }
  if ([name, contactInfo, task, budget, details].some(v => /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v))) {
    return respond('Invalid characters', 400);
  }

  // If Turnstile is configured, enforce server-side verification.
  if (env.TURNSTILE_SECRET_KEY) {
    const token = text(data.turnstileToken, 2048);
    if (!token) return respond('Captcha required', 403);
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip })
    });
    const result = await verification.json();
    if (!result.success) return respond('Captcha failed', 403);
  }

  const payload = {
    from: env.CONTACT_FROM_EMAIL,
    to: [env.CONTACT_TO_EMAIL],
    subject: 'Новая заявка с сайта LUXSTAR',
    text: [
      'Новая заявка с сайта LUXSTAR',
      'Имя / компания: ' + name,
      'Контакт: ' + contactInfo,
      'Задача: ' + task,
      'Бюджет: ' + budget,
      'Описание: ' + details
    ].join('\n')
  };
  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!sent.ok) {
      console.error('Mail provider error:', sent.status);
      return respond('Unable to deliver inquiry', 502);
    }
    return respond('Accepted', 200);
  } catch (error) {
    console.error('Mail transport failed', error);
    return respond('Unable to deliver inquiry', 502);
  }
}

export function onRequest() {
  return respond('Method not allowed', 405);
}

// POST { email } -> emails a 6-digit login code to an owner Gmail ID.
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { isOwner, json, sign, hmac, hasRedis, redis } from './_lib.js';

export async function POST(request) {
  const { email: raw } = await request.json().catch(() => ({}));
  const email = String(raw || '').trim().toLowerCase();
  if (!(await isOwner(email))) return json({ error: 'This email ID does not have owner access.' }, 403);

  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return json({ error: 'Email login is not set up yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in Vercel.' }, 503);

  // At most one code per minute per email
  if (hasRedis()) {
    const ok = await redis('SET', `otp:wait:${email}`, '1', 'NX', 'EX', 60);
    if (!ok) return json({ error: 'A code was just sent. Please wait 1 minute before asking again.' }, 429);
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const exp = Date.now() + 10 * 60e3;
  const token = sign({ kind: 'otp', email, exp, h: hmac(`${email}:${code}:${exp}`) });

  try {
    const mailer = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: pass.replace(/\s+/g, '') } });
    await mailer.sendMail({
      from: `"Sri Vinayaka Flex" <${user}>`,
      to: email,
      subject: `${code} is your Sri Vinayaka Flex admin login code`,
      text: `Your login code is ${code}\n\nIt works for 10 minutes. If you did not try to log in, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:16px">
               <p>Your Sri Vinayaka Flex admin login code is:</p>
               <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#d62828">${code}</p>
               <p style="color:#666">It works for 10 minutes. If you did not try to log in, ignore this email.</p>
             </div>`
    });
  } catch (e) {
    console.error('sendMail failed', e);
    return json({ error: 'Could not send the email. Check GMAIL_USER / GMAIL_APP_PASSWORD in Vercel.' }, 502);
  }
  return json({ ok: true, token });
}

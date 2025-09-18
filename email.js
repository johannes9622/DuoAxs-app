/**
 * Email utils: Postmark preferred, SES fallback, or console log in dev.
 * Configure via .env:
 *   EMAIL_PROVIDER=postmark|ses|console
 *   POSTMARK_TOKEN=xxxxx
 *   SES_REGION=us-east-1
 *   SES_ACCESS_KEY_ID=xxx
 *   SES_SECRET_ACCESS_KEY=xxx
 *   EMAIL_FROM="DuoAxs <no-reply@duoaxs.com>"
 */
import 'dotenv/config';

let client = null;
let provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
const from = process.env.EMAIL_FROM || 'DuoAxs <no-reply@duoaxs.test>';

export async function sendEmail({ to, subject, html, text }){
  if(provider === 'postmark'){
    const token = process.env.POSTMARK_TOKEN;
    if(!token){ console.warn('POSTMARK_TOKEN missing, falling back to console'); provider = 'console'; }
    else {
      if(!client){ const { ServerClient } = await import('postmark'); client = new ServerClient(token); }
      try{
        await client.sendEmail({ From: from, To: to, Subject: subject, HtmlBody: html, TextBody: text });
        return { ok: true, provider: 'postmark' };
      }catch(e){ console.error('Postmark send failed', e); throw e; }
    }
  }
  if(provider === 'ses'){
    const region = process.env.SES_REGION || 'us-east-1';
    const key = process.env.SES_ACCESS_KEY_ID;
    const secret = process.env.SES_SECRET_ACCESS_KEY;
    if(!key || !secret){ console.warn('SES creds missing, falling back to console'); provider = 'console'; }
    else {
      if(!client){
        const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
        client = new SESClient({ region, credentials: { accessKeyId: key, secretAccessKey: secret } });
        client._isSES = true;
      }
      const { SendEmailCommand } = await import('@aws-sdk/client-ses');
      const params = {
        Destination: { ToAddresses: [to] },
        Message: {
          Body: { Html: { Charset: 'UTF-8', Data: html }, Text: { Charset: 'UTF-8', Data: text || '' } },
          Subject: { Charset: 'UTF-8', Data: subject }
        },
        Source: from
      };
      await client.send(new SendEmailCommand(params));
      return { ok: true, provider: 'ses' };
    }
  }
  // console/dev fallback
  console.log('\n[EMAIL:DEV] To:', to, '\nSubject:', subject, '\nHTML:', html, '\n');
  return { ok: true, provider: 'console' };
}

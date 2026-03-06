// Gmail integration via Replit Connectors (google-mail)
import { google } from 'googleapis';
import { storage } from './storage';
import express from 'express';

let connectionSettings: any;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export async function sendEmail(to: string, subject: string, htmlBody: string) {
  try {
    const gmail = await getUncachableGmailClient();
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody,
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

export function setupGmail(app: express.Express) {
  // Gmail initialization if needed
}

export async function sendWeeklyEmail() {
  try {
    const summary = await storage.getAnalyticsSummary();
    const ADMIN_EMAIL = "ahmedsopori@gmail.com";
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #2563eb; margin-bottom: 5px;">NoteNinja Weekly Report</h1>
        <p style="color: #666; font-size: 14px; margin-top: 0;">Analytics summary for the past 7 days</p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0;">
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #64748b;">Total Users</div>
            <div style="font-size: 24px; font-weight: bold;">${summary.totalUsers}</div>
          </div>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #0369a1;">Notes Created</div>
            <div style="font-size: 24px; font-weight: bold; color: #0284c7;">${summary.week.notes}</div>
          </div>
        </div>

        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px;">Activity Breakdown</h3>
        <ul style="list-style: none; padding: 0;">
          ${summary.week.eventCounts.map((e: any) => `
            <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
              <span style="text-transform: capitalize;">${e.eventType.replace(/_/g, ' ')}</span>
              <strong style="color: #334155;">${e.count}</strong>
            </li>
          `).join('')}
        </ul>

        <h3 style="border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 25px;">Top Topics</h3>
        <ul style="list-style: none; padding: 0;">
          ${summary.week.topSubjects.slice(0, 5).map((s: any) => `
            <li style="padding: 5px 0;">${s.subject} (${s.count})</li>
          `).join('')}
        </ul>

        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center;">
          Sent automatically by NoteNinja Admin Scheduler
        </p>
      </div>
    `;

    await sendEmail(ADMIN_EMAIL, "NoteNinja Weekly Analytics Report", html);
    console.log("Weekly email report sent to admin.");
  } catch (err) {
    console.error("Failed to send weekly email report:", err);
  }
}

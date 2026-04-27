const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email, firstName } = JSON.parse(event.body || '{}');

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Email is required' }),
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!resendApiKey || !audienceId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Resend not configured' }),
    };
  }

  // Add to Resend audience
  const contactData = {
    email,
    audience_id: audienceId,
  };

  if (firstName) {
    contactData.first_name = firstName;
  }

  const addContact = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contactData),
  });

  const contactResult = await addContact.json();

  // Send welcome email with PDF
  const pdfUrl = 'https://aihealthtracking.wordpress.com/wp-content/uploads/2026/04/your-free-7-day-ai-generated-meal-plan.pdf';

  const emailData = {
    from: 'AI Health & Wellness <noreply@obrasileiro.info>',
    to: [email],
    subject: 'Your Free 7-Day AI Meal Plan Is Ready!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
      <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:40px;text-align:center">
        <h1 style="color:white;margin:0;font-size:28px">🎉 You're in!</h1>
        <p style="color:#dcfce7;margin:10px 0 0;font-size:16px">Your meal plan is ready</p>
      </div>
      <div style="padding:40px;text-align:center">
        <p style="font-size:18px;color:#374151;margin:0 0 20px">
          Welcome${firstName ? ', ' + firstName : ''}! Your free 7-day AI-powered meal plan is ready.
        </p>
        <p style="color:#6b7280;margin:0 0 30px">
          Click the button below to download your personalised plan:
        </p>
        <a href="${pdfUrl}" style="display:inline-block;background:#16a34a;color:white;font-size:18px;font-weight:bold;padding:16px 40px;border-radius:10px;text-decoration:none;margin-bottom:20px">
          ⬇️ Download Your Free Meal Plan
        </a>
        <p style="color:#9ca3af;font-size:13px;margin:20px 0 0">
          Can't click? Copy this link into your browser:<br>
          <span style="word-break:break-all">${pdfUrl}</span>
        </p>
      </div>
      <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center">
        <p style="color:#9ca3af;font-size:12px;margin:0">
          You're receiving this because you signed up at obrasileiro.info<br>
          AI Health & Wellness Hub — Sabor e Alegria
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };

  const sendEmail = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailData),
  });

  const emailResult = await sendEmail.json();

  if (!sendEmail.ok) {
    console.log('Email send error:', JSON.stringify(emailResult));
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      message: 'Check your inbox for the meal plan!',
    }),
  };
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let email, firstName;
  try {
    ({ email, firstName } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Valid email is required' }),
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email service not configured' }),
    };
  }

  // Optionally add to Resend audience (non-blocking)
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    try {
      const contactData = { email, audience_id: audienceId, unsubscribed: false };
      if (firstName) contactData.first_name = firstName;
      await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });
    } catch (e) {
      console.warn('Audience add failed (non-critical):', e.message);
    }
  }

  // PDF download link
  const pdfUrl = 'https://aihealthtracking.wordpress.com/wp-content/uploads/2026/04/your-free-7-day-ai-generated-meal-plan.pdf';

  // Send welcome email with meal plan PDF link
  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5fbf7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background:#f5fbf7;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(45,122,79,0.1);">
      <tr>
        <td style="background:linear-gradient(135deg,#2d7a4f,#1a5435);padding:32px 40px;text-align:center;">
          <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:0 0 8px;letter-spacing:0.08em;text-transform:uppercase;">AI Health &amp; Wellness Hub</p>
          <h1 style="color:white;font-size:24px;margin:0;font-weight:700;">Your Free 7-Day Meal Plan is Ready!</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:40px;">
          <p style="color:#5a6b61;font-size:15px;line-height:1.7;margin:0 0 8px;">Hi${firstName ? ' ' + firstName : ''},</p>
          <p style="color:#5a6b61;font-size:15px;line-height:1.7;margin:0 0 24px;">Thank you for signing up! Your personalised 7-day AI-generated meal plan is ready to download. Click the button below to get your PDF.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr>
              <td style="background:#2d7a4f;border-radius:10px;padding:15px 32px;">
                <a href="${pdfUrl}" style="color:white;font-size:15px;font-weight:700;text-decoration:none;">Download Your Meal Plan (PDF)</a>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5fbf7;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
            <tr><td>
              <p style="color:#1a1f1c;font-size:14px;font-weight:700;margin:0 0 10px;">What's inside:</p>
              <p style="color:#5a6b61;font-size:14px;line-height:1.9;margin:0;">
                &#10003; 7 days of breakfast, lunch, snack &amp; dinner<br>
                &#10003; Calorie &amp; macro breakdown for every meal<br>
                &#10003; ~1,800-2,000 kcal/day, high-protein focus<br>
                &#10003; Full weekly shopping list<br>
                &#10003; Meal prep tips to save time
              </p>
            </td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e8f5ee;margin:0 0 20px;">
          <p style="color:#5a6b61;font-size:14px;margin:0;">More tips at <a href="https://aihealthtracking.wordpress.com" style="color:#2d7a4f;font-weight:600;">aihealthtracking.wordpress.com</a></p>
        </td>
      </tr>
      <tr>
        <td style="background:#f5fbf7;padding:20px 40px;text-align:center;border-top:1px solid #e8f5ee;">
          <p style="color:#9bbfab;font-size:12px;margin:0;">You received this because you requested a free meal plan at aihealthtracking.wordpress.com.<br>No spam, ever. <a href="#" style="color:#9bbfab;">Unsubscribe</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AI Health & Wellness Hub <noreply@obrasileiro.info>',
        to: [email],
        subject: 'Your Free 7-Day AI Meal Plan is Ready!',
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Resend error:', errText);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Failed to send email' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

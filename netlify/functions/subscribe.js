exports.handler = async (event) => {
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

  const mealPlanUrl = 'https://www.obrasileiro.info/meal-plan';
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Free 7-Day AI Meal Plan</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#2e7d32,#66bb6a);padding:40px 40px 30px;text-align:center;">
              <p style="margin:0 0 8px;color:#c8e6c9;font-size:13px;letter-spacing:2px;text-transform:uppercase;">AI Health &amp; Wellness Hub</p>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;line-height:1.2;">Your Free 7-Day<br>AI Meal Plan is Ready!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:17px;color:#333333;">${greeting},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#555555;line-height:1.6;">Thank you for signing up! Your personalised <strong>7-day AI-generated meal plan</strong> is ready. Click the button below to view your complete plan online.</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:10px 0 30px;">
                    <a href="${mealPlanUrl}" style="display:inline-block;background:linear-gradient(135deg,#2e7d32,#43a047);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:50px;letter-spacing:0.5px;">View My Meal Plan</a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f8e9;border-radius:8px;margin-bottom:30px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#2e7d32;text-transform:uppercase;letter-spacing:1px;">What&apos;s Inside</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#444444;">&#10003;&nbsp; 7 days of breakfast, lunch, snack &amp; dinner</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#444444;">&#10003;&nbsp; Calorie &amp; macro breakdown for every meal</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#444444;">&#10003;&nbsp; ~1,800&ndash;2,000 kcal/day, high-protein focus</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#444444;">&#10003;&nbsp; Full weekly shopping list</p>
                    <p style="margin:0;font-size:14px;color:#444444;">&#10003;&nbsp; Meal prep tips to save time</p>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#999999;text-align:center;">More tips at <a href="https://aihealthtracking.wordpress.com" style="color:#2e7d32;">aihealthtracking.wordpress.com</a></p>
              <p style="margin:0;font-size:12px;color:#bbbbbb;text-align:center;">You received this because you requested a free meal plan. No spam, ever.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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

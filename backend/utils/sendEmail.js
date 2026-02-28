const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOtpEmail = async (to, otp) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Your Expense Tracker Login OTP',
    html: `
      <div style="font-family: 'Space Grotesk', sans-serif; max-width: 480px; margin: auto; padding: 32px; background: #f0fdf4; border-radius: 16px; border: 1px solid #bbf7d0;">
        <h2 style="color: #166534; margin: 0 0 8px;">Expense Tracker</h2>
        <p style="color: #374151; font-size: 15px;">Your one-time login code is:</p>
        <div style="background: #dcfce7; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #15803d;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  };
  await sgMail.send(msg);
};

module.exports = { sendOtpEmail };

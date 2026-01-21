// utils/sendEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT === '465',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
};

const sendFeedbackResponseEmail = async ({ to, userName, orderNumber, adminResponse }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .response { background: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Response to Your Feedback</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Thank you for sharing your feedback for order <strong>#${orderNumber}</strong>. We appreciate you taking the time to help us improve.</p>
          
          <div class="response">
            <h3>Our Response:</h3>
            <p>${adminResponse}</p>
          </div>
          
          <p>We value your opinion and are constantly working to enhance our services based on customer feedback like yours.</p>
          
          <p>If you have any further questions or concerns, please don't hesitate to contact our support team.</p>
          
          <a href="${process.env.CLIENT_URL}/orders" class="button">View Your Orders</a>
          
          <p>Best regards,<br>The ${process.env.COMPANY_NAME} Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} ${process.env.COMPANY_NAME}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    email: to,
    subject: `Response to Your Feedback - Order #${orderNumber}`,
    html
  });
};

module.exports = {
  sendEmail,
  sendFeedbackResponseEmail
};
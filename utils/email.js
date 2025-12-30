const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        host: process.env.GOOGLE_SMTP_HOST,
        port: process.env.GOOGLE_SMTP_PORT,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.GOOGLE_SMTP_USER,
            pass: process.env.GOOGLE_SMTP_PASS
        }
    });

    const mailOptions = {
        from: `"NexLink" <${process.env.GOOGLE_SMTP_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;

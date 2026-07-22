import nodemailer from "nodemailer";

interface senderReturnType {
  ok: boolean;
}
const myEmail = process.env.GMAIL_NAME;
const myPassword = process.env.GMAIL_PASSWORD;

// 1. Authenticate into Gmail's Official Service
const transporter = nodemailer.createTransport({
  service: "gmail", // Shortcut tells Nodemailer to automatically configure host/ports
  auth: {
    user: myEmail,
    pass: myPassword,
  },
});

// 2. Setup your message details
const mailOptions = (
  name: string,
  userEmail: string,
  message: string,
  subject?: string,
  phoneNumber?: string,
) => ({
  from: `"Message from GR-Tech sent by ${name}" <${myEmail}>`,

  to: "grtechservices2@gmail.com",

  // 🌟 USE THIS for custom directions: If you want replies to go to a separate business email
  replyTo: userEmail,

  subject: `Message from 'contact us' form on GR Tech Website`,
  text: `This email was sent by a user on your website..The content is as displayed below\n\n
  Name: ${name}\n
  Email: ${userEmail}
  Phone number: ${phoneNumber}
  Reason of message: ${subject}\n
  Message: ${message}
  `,
});

async function sendMail(
  name: string,
  email: string,
  message: string,
  subject?: string,
  phoneNumber?: string,
): Promise<senderReturnType> {
  const userEmail = email;
  try {
    await transporter.sendMail(
      mailOptions(name, userEmail, message, subject, phoneNumber),
    );
    console.log("Email sent successfully through Gmail!");
    return { ok: true };
  } catch (error) {
    console.error("Gmail transmission failed:", error);
    return { ok: false };
  }
}

export default sendMail;

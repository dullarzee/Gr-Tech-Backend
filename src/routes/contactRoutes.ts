import { Router, Response, Request } from "express";
import sendMail from "../controllers/mailer";

const router = Router();

router.post("/contactEmail", async (req: Request, res: Response) => {
  const { name, email, phoneNumber, subject, message } = req.body;

  try {
    if (!name || !email || !phoneNumber || !subject || !message)
      return res
        .status(400)
        .json({ message: "Please include all required fields", ok: false });

    const response = await sendMail(name, email, message, phoneNumber, subject);
    if (!response.ok) throw new Error("Failed to send email");

    res.status(200).json({ message: "Successful", ok: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: err instanceof Error && err.message, ok: false });
  }
});

export default router;

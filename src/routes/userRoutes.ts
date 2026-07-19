import { Router, type Request, type Response, CookieOptions } from "express";
import prisma from "../prismaInit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

const isProd = process.env.ENVIRONMENT !== "dev";

const jwt_secret: string = process.env.jwt_secret as string;
const max_age_in_seconds = 60 * 60 * 24 * 3;
const cookieOptions: CookieOptions = {
  maxAge: max_age_in_seconds * 1000,
  httpOnly: isProd,
  sameSite: isProd ? "none" : "lax",
  secure: isProd,
};

const createJwtToken = (id: any) => {
  return jwt.sign({ id }, jwt_secret, { expiresIn: max_age_in_seconds });
};

router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        order: true,
      },
    });
    if (!users) throw new Error("Server error: COuldn't fetch users");

    res.status(200).json({ ok: true, data: users, message: "Success" });
  } catch (err) {
    res
      .status(500)
      .json({ message: err instanceof Error && err.message, ok: false });
  }
});

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name, phoneNumber } = req.body;
  if (!(email && password && name)) {
    return res.status(400).json({
      message: "Email, password and name must be provided",
      ok: false,
    });
  }

  //hashing of password
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phoneNumber: phoneNumber || null,
      },
    });
    if (!user) throw Error("User unable to be created");
    const token = createJwtToken(user.id as any);
    res.cookie("jwt", token, cookieOptions);
    res.cookie("newUser", true, { expires: undefined });
    res.status(201).json({ data: user, ok: true, message: "successful" });
  } catch (err) {
    console.log("signup error: ", err);
    res.status(500).json({
      message:
        err instanceof Error ? err.message : "There was an error signing up",
      ok: false,
    });
  }
});

//  /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!(email && password))
    return res
      .status(400)
      .json({ message: "Email and password must be provided", ok: false });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Error("User not found!");
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) throw Error("Incorrect password");

    //create jwt
    const token = createJwtToken(user.id as any);
    res.cookie("jwt", token, cookieOptions);
    res.status(200).json({ message: "Login successful", ok: true, data: user });
  } catch (err) {
    console.log("err: ", err);
    if (
      err instanceof Error &&
      (err.message === "User not found!" ||
        err.message === "Incorrect password")
    ) {
      return res.status(401).json({ message: err.message, ok: false });
    }
    res.status(500).json({
      message: "There was an error logging in",
      ok: false,
    });
  }
});

router.get("/checkAuth", async (req: Request, res: Response) => {
  const token = req.cookies.jwt;
  if (!token) {
    console.log("stop 1");
    return res.status(401).json({ message: "Unauthorized", ok: false });
  }
  try {
    const decoded = jwt.verify(token, jwt_secret);
    const user = await prisma.user.findUnique({
      where: { id: (decoded as any).id },
    });
    console.log("stop 2");

    res.status(200).json({ message: "Authorized", ok: true, data: user });
  } catch (err) {
    console.log("stop 3");

    res.status(401).json({ message: "Unauthorized", ok: false });
  }
});

router.get("/logout", async (_: Request, res: Response) => {
  res.clearCookie("jwt", cookieOptions);
  res.cookie("jwt", "", {
    httpOnly: isProd,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    expires: new Date(0),
  });
  return res.status(200).json({ message: "Signed out successfully", ok: true });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id)
    return res
      .status(400)
      .json({ ok: false, message: "Please include 'Id' in query params" });

  try {
    const deletedUser = await prisma.user.delete({
      where: {
        id: id as string,
      },
    });
    if (!deletedUser) throw new Error("User couldn't be deleted");

    res.status(200).json({ ok: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ ok: false, message: "failed to delete user" });
  }
});

export default router;

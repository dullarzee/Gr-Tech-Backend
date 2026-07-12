import { Router, Response, Request } from "express";
import prisma from "../prismaInit";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const { limit } = req.query;
  if (limit && typeof Number(limit) !== "number") {
    console.log("limit(number):", Number(limit), "limit(string): ", limit);
    return res
      .status(400)
      .json({ message: "limit query string must be a number", ok: false });
  }
  const checkedLimit = limit ? Number(limit) : undefined;
  try {
    const products = await prisma.product.findMany();
    const limitedProducts = checkedLimit
      ? products.slice(0, checkedLimit)
      : products;
    return res
      .status(200)
      .json({ message: "Successful", ok: true, data: limitedProducts });
  } catch (err) {
    return res.status(500).json({ error: err, ok: false });
  }
});

//  /api/products/:id
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ message: "product id is not included", ok: false });
  }

  try {
    const newProduct = await prisma.product.findUnique({
      where: {
        id: id as string,
      },
    });
    return res
      .status(200)
      .json({ ok: true, message: "Successful", data: newProduct });
  } catch (err) {
    return res.status(500).json({ error: err, ok: false });
  }
});

export default router;

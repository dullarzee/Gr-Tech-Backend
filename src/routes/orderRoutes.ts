import { Router, type Response, type Request } from "express";
import prisma from "../prismaInit";
import { Prisma } from "../generated/prisma/client";

const router = Router();

type sortOrderTypes = "asc" | "desc";

router.get("/", async (req: Request, res: Response) => {
  const sortByParam =
    typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
  const sortOrderParam =
    typeof req.query.sortOrder === "string" ? req.query.sortOrder : "desc";
  const sortOrder: sortOrderTypes = sortOrderParam === "asc" ? "asc" : "desc";
  const normalizedSortBy = sortByParam?.toLowerCase();

  let orderByClause: Prisma.OrderOrderByWithRelationInput | undefined;

  if (normalizedSortBy === "createdat" || normalizedSortBy === "created_at") {
    orderByClause = { createdAt: sortOrder };
  } else if (
    normalizedSortBy === "updatedat" ||
    normalizedSortBy === "updated_at"
  ) {
    orderByClause = { updatedAt: sortOrder };
  } else if (normalizedSortBy === "totalamount") {
    orderByClause = { totalAmount: sortOrder };
  }

  try {
    const findManyArgs: Prisma.OrderFindManyArgs = {
      include: {
        user: true,
        items: true,
      },
    };

    if (orderByClause) {
      findManyArgs.orderBy = orderByClause;
    }

    const orders = await prisma.order.findMany(findManyArgs);
    if (!orders) throw new Error("Failed to get orders");

    res.status(200).json({ message: "success", ok: true, data: orders });
  } catch (err) {
    res
      .status(500)
      .json({ ok: false, message: err instanceof Error && err.message });
  }
});

router.get("/userOrders/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res
      .status(400)
      .json({ message: "product id is not included", ok: false });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: userId as string,
      },
      include: {
        items: true,
      },
    });
    return res
      .status(200)
      .json({ ok: true, message: "Successful", data: orders });
  } catch (err) {
    return res.status(500).json({ error: err, ok: false });
  }
});

//  /api/orders/submitOrder
//  submit order to DB for admin to view
router.post("/submitOrder/:userId", async (req: Request, res: Response) => {
  const body = req.body;
  const { userId } = req.params;
  const { streetAddress, city, state, phoneNumber, email, products } = body;
  if (!body)
    return res
      .status(400)
      .json({ message: "please include 'body' in ur POST request", ok: false });

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId as string,
      },
    });
    if (!user)
      return res.status(404).json({ message: "User not found", ok: false });

    const totalAmount = (products as any[]).reduce((prevValue, product) => {
      return prevValue + product.price * product.quantity;
    }, 0);

    const response = await prisma.order.create({
      data: {
        userId: userId as string,
        phoneNumber,
        email,
        items: {
          createMany: {
            data: products.map((prod: any) => ({
              productId: prod.id,
              productName: prod.name,
              quantity: prod.quantity,
              price: prod.price,
              imageUrl: prod.imageUrl,
            })),
          },
        },
        totalAmount: totalAmount,
        shippingAddress: streetAddress + ", " + city + ", " + state,
      },
    });

    console.log("updated User; ", response);
    if (!response) throw Error("couldn't add order to user");

    return res
      .status(201)
      .json({ message: "Added Order Successfully", ok: true });
  } catch (err) {
    console.log("err at submitOrder EP: ", err);
    return res.json({
      message:
        err instanceof Error ? err.message : "Couldn't add order successfully",
      ok: false,
    });
  }
});

router.delete("/delete/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id)
    return res
      .status(400)
      .json({ ok: false, message: "Please include 'Id' in query params" });

  try {
    const order = await prisma.order.delete({
      where: {
        id: id as string,
      },
    });
    if (!order) throw new Error("Order couldn't be deleted");

    res.status(200).json({ ok: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ ok: false, message: "failed to delete order" });
  }
});

export default router;

import { Router, Request, Response } from "express";
import prisma from "../prismaInit";

const router = Router();

//  api/cart/add
router.post("/add", async (req: Request, res: Response) => {
  const { productId, userId, quantity } = req.body;
  console.log("stop 0");

  if (!(productId && userId && quantity))
    return res
      .status(400)
      .json({ message: "please provide all fields", ok: false });

  try {
    //check if product exists in users cart
    const user = await prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId: userId,
          productId: productId,
        },
      },
    });

    if (user)
      return res
        .status(400)
        .json({ message: "Product already in cart", ok: false });

    const updatedUser = await prisma.cartItem.create({
      data: {
        productId: productId,
        quantity: quantity,
        userId: userId,
      },
    });

    if (!updatedUser) throw Error("Unable to add product to cart");
    res.status(200).json({ message: "Product added to cart", ok: true });
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An unknown error occurred",
      ok: false,
    });
  }
});

router.get("/getAll/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId)
    return res
      .status(400)
      .json({ message: "userId must be included", ok: false });
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId as string,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found", ok: false });
    }

    if (user) {
      //if user is found, aggregate all productIds in the cart in a variable
      const productIds = await prisma.cartItem.findMany({
        where: {
          userId: userId as string,
        },
        select: {
          productId: true,
          quantity: true,
        },
      });

      //mapping each productId to quantity as tuples/key-value pairs to be retrieved later
      const cartMap = new Map(
        productIds.map((it) => [it.productId, it.quantity]),
      );

      //extracting product IDs from object
      const productIdss = productIds.map((productId) => productId.productId);

      //querying for array of productIds in one round trip
      const products = await prisma.product.findMany({
        where: {
          id: {
            in: productIdss as [],
          },
        },
      });

      const completeProductDetails = products.map((product) => {
        return {
          ...product,
          quantity: cartMap.get(product.id),
        };
      });

      res.status(200).json({
        data: completeProductDetails,
        ok: true,
        message: "Products in cart retrieved successfully",
      });
    }
  } catch (err) {
    res.status(500).json({
      message: err instanceof Error ? err.message : "An unknown error occurred",
      ok: false,
    });
  }
});

router.delete(
  "/delete/:userId/:productId",
  async (req: Request, res: Response) => {
    const { userId, productId } = req.params;
    if (!(userId && productId))
      return res.status(400).json({
        message: "Please include all required IDs in path",
        ok: false,
      });
    try {
      const response = await prisma.cartItem.delete({
        where: {
          userId_productId: {
            userId: userId as string,
            productId: productId as string,
          },
        },
      });

      if (!response) throw Error("Unable to remove product from cart");
      res.status(200).json({
        message: "Cart updated successfully - delete",
        ok: true,
        data: response,
      });
    } catch (err) {
      res.status(500).json({
        message:
          err instanceof Error ? err.message : "An unknown error occurred",
        ok: false,
      });
    }
  },
);

//  /api/cart/update/:userId/:productId/:quantity
//update cart item
router.patch(
  "/update/:userId/:productId/:quantity",
  async (req: Request, res: Response) => {
    const { userId, productId, quantity } = req.params;
    if (!(userId && productId && quantity))
      return res
        .status(400)
        .json({ message: "please provide all fields", ok: false });

    try {
      const response = await prisma.cartItem.update({
        where: {
          userId_productId: {
            userId: userId as string,
            productId: productId as string,
          },
        },
        data: {
          quantity: Number(quantity),
        },
      });
      console.log("user after quantity updated: ", response);
      if (!response)
        throw Error("Quantity of item in user's cart could not be updated");

      return res.json({ message: "Cart Succesfully updated!", ok: true });
    } catch (error) {
      if (error instanceof Error) {
        res.json({ message: error.message, ok: false });
      }
    }
  },
);

//  /api/cart/clearCart
router.delete("/clearCart/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId)
    return res
      .status(400)
      .json({ message: "Please add userId in path", ok: false });

  try {
    const response = await prisma.cartItem.deleteMany({
      where: {
        userId: userId as string,
      },
    });
    if (!response) throw Error("Failed to clear cart");

    res.status(200).json({ message: "Cart cleared successfully", ok: true });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err instanceof Error && err.message, ok: false });
  }
});

//  /api/cart/submitOrder
//  submit order to DB for admin to view
router.post("/submitOrder", async (req: Request, res: Response) => {
  const body = req.body;
  const { userId, shippingAddress, phoneNumber, email, products } = body;
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

    const response = await prisma.order.create({
      data: {
        userId: userId as string,
        shippingAddress,
        phoneNumber,
        email,
        items: {
          createMany: {
            data: products.map((prod: any) => ({
              productId: prod.id,
              productName: prod.name,
              quantity: prod.quantity,
              price: prod.price,
            })),
          },
        },
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

export default router;

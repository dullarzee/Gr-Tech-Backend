import { Router, Response, Request } from "express";
import { createClient } from "@supabase/supabase-js";
import prisma from "../prismaInit";

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const payload = {
      name: body.name,
      description: body.description,
      price: Number(body.price),
      stock: Number(body.stock),
      category: body.category,
      variant: body.variant ?? "",
      imageUrl: body.imageUrl ?? "",
      images: Array.isArray(body.images)
        ? body.images
        : body.imageUrl
          ? [body.imageUrl]
          : [],
      features: Array.isArray(body.features) ? body.features : [],
      ratings: Array.isArray(body.ratings) ? body.ratings : [],
    };

    const product = await prisma.product.create({ data: payload });
    return res
      .status(201)
      .json({ message: "Product created", ok: true, data: product });
  } catch (err) {
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to create product",
      ok: false,
    });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const product = await prisma.product.update({
      where: { id: id as string },
      data: {
        name: body.name,
        description: body.description,
        price: Number(body.price),
        stock: Number(body.stock),
        category: body.category,
        variant: body.variant ?? "",
        imageUrl: body.imageUrl ?? "",
        images: Array.isArray(body.images)
          ? body.images
          : body.imageUrl
            ? [body.imageUrl]
            : [],
        features: Array.isArray(body.features) ? body.features : [],
      },
    });

    return res
      .status(200)
      .json({ message: "Product updated", ok: true, data: product });
  } catch (err) {
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to update product",
      ok: false,
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id: id as string } });
    return res.status(200).json({ message: "Product deleted", ok: true });
  } catch (err) {
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Failed to delete product",
      ok: false,
    });
  }
});

router.post("/upload-image", async (req: Request, res: Response) => {
  try {
    const { imageBase64, fileName, contentType } = req.body;
    // 💡 Tip: Pass contentType (like "image/jpeg") from frontend if possible,
    // otherwise default to a fallback.

    if (!imageBase64 || !fileName) {
      return res
        .status(400)
        .json({ message: "imageBase64 and fileName are required", ok: false });
    }

    const bucketName = process.env.SUPABASE_BUCKET_NAME || "products";

    if (!supabase) {
      return res.status(500).json({
        message: "Supabase storage configuration missing.",
        ok: false,
      });
    }

    const sanitizedFileName = fileName
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const finalContentType = contentType || "image/png";

    let noOfRetries = 1;
    let suffixedBucketName = bucketName + noOfRetries;
    do {
      try {
        const { data, error } = await supabase.storage
          .from(suffixedBucketName)
          .upload(sanitizedFileName, buffer, {
            contentType: finalContentType,
            upsert: true,
          });

        //break out of loop
        if (data) break;

        console.log("data: ", data);
        console.log("error: ", error);

        if (error || !data) {
          return res.status(500).json({
            message: error?.message || "Upload failed",
            ok: false,
          });
        }
      } catch (err) {}
      noOfRetries++;
    } while (noOfRetries < 4);

    const { data: signedUrlData } = await supabase.storage
      .from(suffixedBucketName)
      .createSignedUrl(sanitizedFileName, 60 * 60 * 24 * 3 * 30 * 12 * 10);

    return res.status(200).json({
      message: "Image uploaded successfully",
      ok: true,
      data: {
        imageUrl: signedUrlData?.signedUrl,
        fileName: sanitizedFileName,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Image upload failed",
      ok: false,
    });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const { limit, sortBy } = req.query;

  // if (limit !== "undefined" && isNaN(Number(limit))) {
  //   console.log(limit);
  //   return res
  //     .status(400)
  //     .json({ message: "limit query string must be a number", ok: false });
  // }
  let checkedLimit: number | undefined = undefined;
  if (limit !== "undefined") {
    const parsed = Number(limit);
    if (isNaN(parsed)) {
      return res.status(400).json({
        message: "limit query string must be a valid number",
        ok: false,
      });
    }
    checkedLimit = parsed;
  }

  try {
    let orderByConfig: Record<string, "asc" | "desc"> | undefined = undefined;

    if (sortBy === "low") {
      orderByConfig = { price: "asc" };
    } else if (sortBy === "high") {
      orderByConfig = { price: "desc" };
    } else if (sortBy === "newest") {
      // 💡 NOTE: Ensure "createdAt" actually exists on your Product model in schema.prisma!
      orderByConfig = { created_at: "desc" };
    }

    // 3. Exactly one safe, unified database round trip
    const products = await prisma.product.findMany({
      take: checkedLimit as number, // Passes either a valid integer number or undefined (safe)
      ...(orderByConfig && { orderBy: orderByConfig }), // Spreads the sorting configuration only if defined
    });

    return res
      .status(200)
      .json({ message: "Successful", ok: true, data: products });
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

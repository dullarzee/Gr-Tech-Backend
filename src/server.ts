import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import { serverGuard } from "./middleware.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

const PORT = 8080;

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(serverGuard);

app.use("/api/auth", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.get("/", (req, res) => {
  return res
    .status(200)
    .send(
      "<h1>This is root of server, the only accessible part of the server without a key</h1>",
    );
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

/*
  Warnings:

  - Added the required column `imageUrl` to the `order_items` table without a default value. This is not possible if the table is not empty.
  - Made the column `totalAmount` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "imageUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "totalAmount" SET NOT NULL;

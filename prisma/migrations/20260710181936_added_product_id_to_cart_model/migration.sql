/*
  Warnings:

  - Added the required column `productId` to the `carts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "productId" TEXT NOT NULL;

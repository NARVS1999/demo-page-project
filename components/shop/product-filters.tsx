"use client";

import { Label } from "@/components/ui/label";
import Link from "next/link";

export type ProductFilterValues = {
  category: string;
  price: string;
};

export function ProductFilters({ current }: { current: ProductFilterValues }) {
  return (
    <form
      method="GET"
      action="/shop"
      aria-label="Shop filters"
      className="flex flex-wrap items-end gap-4 border-y border-border py-4"
    >
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <Label htmlFor="shop-category">Category</Label>
        <select
          id="shop-category"
          name="category"
          defaultValue={current.category}
          onChange={(event) => event.currentTarget.form?.submit()}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:[color-scheme:dark] sm:w-auto"
        >
          <option value="all">All products</option>
          <option value="drinks">Drinks</option>
          <option value="beans">Beans</option>
          <option value="bakery">Bakery</option>
        </select>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <Label htmlFor="shop-price">Price</Label>
        <select
          id="shop-price"
          name="price"
          defaultValue={current.price}
          onChange={(event) => event.currentTarget.form?.submit()}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm dark:[color-scheme:dark] sm:w-auto"
        >
          <option value="all">All prices</option>
          <option value="under-5">Under ₱5</option>
          <option value="5-15">₱5–₱15</option>
          <option value="over-15">Over ₱15</option>
        </select>
      </div>
      {(current.category !== "all" || current.price !== "all") && (
        <Link
          href="/shop"
          className="h-10 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Clear filters
        </Link>
      )}
    </form>
  );
}

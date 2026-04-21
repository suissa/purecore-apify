import { useEffect, useState } from "react";
import api from "../lib/api";
import { useCart } from "../context/CartContext";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const { addToCart, items } = useCart();

  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => setProducts(data))
      .catch(console.error);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/cart">
          <Button variant="outline">Cart ({items.length})</Button>
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{product.description}</p>
              <p className="mt-2 font-bold">${product.price.toFixed(2)}</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => addToCart(product)} className="w-full">
                Add to Cart
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

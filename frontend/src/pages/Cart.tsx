import { useCart } from "../context/CartContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Cart() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = async () => {
    try {
      const orderItems = items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));
      await api.post("/orders", { items: orderItems });
      alert("Order placed successfully!");
      clearCart();
      navigate("/");
    } catch (err) {
      alert("Checkout failed");
    }
  };

  if (items.length === 0) return <div className="p-4">Cart is empty</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Shopping Cart</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.product.id}>
              <TableCell>{item.product.name}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>${item.product.price.toFixed(2)}</TableCell>
              <TableCell>
                ${(item.product.price * item.quantity).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end items-center gap-4">
        <div className="text-xl font-bold">Total: ${total.toFixed(2)}</div>
        <Button onClick={handleCheckout}>Checkout</Button>
      </div>
    </div>
  );
}

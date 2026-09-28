import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { MenuItem } from '../types';
import { SelectedOption } from '../types/storefront';

export interface CartLine {
  // Same item with different options = different lines.
  key: string;
  menuItemId: string;
  name: string;
  // Unit price including options — what the customer sees. The server
  // recomputes it from the menu when the order is placed.
  unitPrice: number;
  quantity: number;
  options: SelectedOption[];
  optionLabels: string[];
  photo?: string;
}

interface CartContextValue {
  linesFor: (spotId: string) => CartLine[];
  addToCart: (spotId: string, item: MenuItem, options: SelectedOption[], quantity: number) => void;
  setQuantity: (spotId: string, key: string, quantity: number) => void;
  clearCart: (spotId: string) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const EMPTY: CartLine[] = [];

export function lineKey(menuItemId: string, options: SelectedOption[]) {
  const opts = options
    .map((o) => `${o.groupId}:${o.choiceId}`)
    .sort()
    .join('|');
  return `${menuItemId}#${opts}`;
}

export function describeOptions(item: MenuItem, options: SelectedOption[]) {
  let extra = 0;
  const labels: string[] = [];
  for (const sel of options) {
    const group = item.options?.find((g) => g.id === sel.groupId);
    const choice = group?.choices.find((c) => c.id === sel.choiceId);
    if (!choice) continue;
    extra += choice.price;
    labels.push(choice.name);
  }
  return { unitPrice: item.price + extra, labels };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [carts, setCarts] = useState<Record<string, CartLine[]>>({});

  const linesFor = useCallback((spotId: string) => carts[spotId] ?? EMPTY, [carts]);

  const addToCart = useCallback(
    (spotId: string, item: MenuItem, options: SelectedOption[], quantity: number) => {
      const key = lineKey(item.id, options);
      const { unitPrice, labels } = describeOptions(item, options);
      setCarts((prev) => {
        const lines = prev[spotId] ?? [];
        const existing = lines.find((l) => l.key === key);
        const next = existing
          ? lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + quantity) } : l))
          : [
              ...lines,
              {
                key,
                menuItemId: item.id,
                name: item.name,
                unitPrice,
                quantity,
                options,
                optionLabels: labels,
                photo: item.photo,
              },
            ];
        return { ...prev, [spotId]: next };
      });
    },
    [],
  );

  const setQuantity = useCallback((spotId: string, key: string, quantity: number) => {
    setCarts((prev) => {
      const lines = prev[spotId] ?? [];
      const next =
        quantity <= 0
          ? lines.filter((l) => l.key !== key)
          : lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, quantity) } : l));
      return { ...prev, [spotId]: next };
    });
  }, []);

  const clearCart = useCallback((spotId: string) => {
    setCarts((prev) => {
      const { [spotId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const value = useMemo(
    () => ({ linesFor, addToCart, setQuantity, clearCart }),
    [linesFor, addToCart, setQuantity, clearCart],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}

export function cartTotals(lines: CartLine[]) {
  return lines.reduce(
    (acc, l) => ({ count: acc.count + l.quantity, total: acc.total + l.unitPrice * l.quantity }),
    { count: 0, total: 0 },
  );
}

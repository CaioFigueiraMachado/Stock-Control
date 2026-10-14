export type Role = "admin" | "user";

export type Screen =
  | "login"
  | "signup"
  | "dashboard"
  | "categories"
  | "products"
  | "new-product"
  | "edit-product"
  | "new-comment"
  | "movement"
  | "history"
  | "design-system";

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  unit: string;
  active: boolean;
  image: string;
};

/** Dados enviados ao salvar um produto (sem id/código, que são gerados pelo banco). */
export type ProductInput = Omit<Product, "id" | "code">;

export type MovementType = "Entrada" | "Saída" | "Ajuste";

export type Movement = {
  id: string;
  productId: string;
  movedAt: string; // ISO
  type: MovementType;
  quantity: number;
  responsible: string;
  note: string;
  balance: number;
};

/** Movimentação com o nome do produto, para listas gerais (painel). */
export type MovementWithProduct = Movement & { productName: string; productCode: string };

export type Comment = {
  id: string;
  productId: string;
  author: string;
  role: string;
  createdAt: string; // ISO
  text: string;
};

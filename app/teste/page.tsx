import { getCategories } from "@/lib/queries";

export default async function TestePage() {
  const categorias = await getCategories();
  return <pre>{JSON.stringify(categorias, null, 2)}</pre>;
}
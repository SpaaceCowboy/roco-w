import { listCategoriesForAdmin } from "@/lib/admin/category-service";
import { requireAdminSession } from "@/lib/admin/session";
import { CategoryManager } from "./CategoryManager";
import styles from "../../admin.module.css";

export const metadata = { title: "Categories — RocoBroker admin" };

export default async function CategoriesPage() {
  const session = await requireAdminSession();
  const categories = await listCategoriesForAdmin(session);
  return (
    <main id="admin-main" tabIndex={-1} className={styles.mainInner}>
      <CategoryManager categories={categories.map((category) => ({ ...category, updatedAt: category.updatedAt.toISOString() }))} />
    </main>
  );
}

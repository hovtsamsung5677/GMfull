import { MallWidget } from "./index";
import type { Category, SubcategoryItem } from "./types";

/** Пример использования — просто для наглядности, можно удалить */
export default function ExampleUsage() {
  function handleSelectItem(category: Category, floor: number, item: SubcategoryItem) {
    console.log("Выбрано:", category.title, `${floor} этаж`, item.name);
    // здесь навигация к списку точек / карте
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
      <MallWidget onSelectItem={handleSelectItem} onCollapse={() => console.log("collapse")} />
    </div>
  );
}

import type { BadgeVariant } from "@/shared/ui/badge"
import type { ProductCategory } from "@/entities/product/model/types"

const PRODUCT_CATEGORY_BADGE: Record<ProductCategory, BadgeVariant> = {
  정기예금: "primary",
  정기적금: "success",
}

export function getProductCategoryBadgeVariant(
  category: ProductCategory,
): BadgeVariant {
  return PRODUCT_CATEGORY_BADGE[category]
}

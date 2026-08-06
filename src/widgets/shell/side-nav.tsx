import { Link, useLocation } from "react-router"
import { NAV, type NavGroup, type NavItem } from "@/shared/config/nav"
import { cn } from "@/shared/lib/utils"

type SideNavProps = {
  /** Current top-level NAV category id, e.g. "inquiry". */
  activeId: string
}

/**
 * Section-local left navigation. Shows the sub-menu tree for the current
 * top-level category (AppHeader's hover mega-menu switches between
 * categories; this switches between screens within one category).
 */
export const SideNav = ({ activeId }: SideNavProps) => {
  const category = NAV.find((c) => c.id === activeId)
  const { pathname } = useLocation()

  if (!category) return null

  return (
    <nav
      className="sticky top-22 flex w-50 shrink-0 flex-col gap-5 self-start border-r border-border pr-6"
      aria-label={`${category.label} 메뉴`}
    >
      <h2 className="text-lg font-bold text-ink">{category.label}</h2>
      {category.groups.map((group: NavGroup) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="text-xs text-ink-faint">{group.title}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item: NavItem) => {
              const active = pathname === item.path
              return (
                <li key={`${item.screenId}-${item.path}`}>
                  <Link
                    to={item.path}
                    data-screen-id={item.screenId}
                    className={cn(
                      "block px-2 py-1.5 text-base whitespace-nowrap transition-colors",
                      active
                        ? "bg-primary-tint font-bold text-primary"
                        : "text-ink-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

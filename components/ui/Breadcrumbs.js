import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

/** Visual breadcrumb trail. `items` = [{ label, href? }]; the last item is the current page. */
export default async function Breadcrumbs({ items }) {
  const t = await getTranslations('Common')

  return (
    <nav aria-label={t('breadcrumb')} className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={item.label} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="font-medium text-blue-800">
                  {item.label}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="text-blue-600 underline underline-offset-2">
                    {item.label}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

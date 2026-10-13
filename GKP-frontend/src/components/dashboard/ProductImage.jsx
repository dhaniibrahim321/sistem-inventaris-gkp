import { Package } from 'lucide-react'

export function getGambarProduk(item) {
  return item?.gambar || item?.image || item?.foto || item?.gambarProduk || null
}

const SIZE_CLASS = {
  sm: 'w-9 h-9',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
}

export default function ProductImage({ item, size = 'md' }) {
  const gambar = getGambarProduk(item)
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md

  if (gambar) {
    return (
      <img
        src={gambar}
        alt={item?.nama || 'Barang'}
        className={`${sizeClass} rounded-lg object-cover border border-slate-200 bg-white shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center border border-violet-100 shrink-0`}
    >
      <Package size={size === 'lg' ? 21 : 17} />
    </div>
  )
}

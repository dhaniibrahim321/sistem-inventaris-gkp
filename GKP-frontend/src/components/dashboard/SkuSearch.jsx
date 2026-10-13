import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import ProductImage from './ProductImage'

const MAKS_HASIL = 6

export default function SkuSearch({ barang, selectedSku, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [aktif, setAktif] = useState(0)

  const wrapperRef = useRef(null)
  const listId = useId()

  const keyword = query.trim().toLowerCase()

  const hasil = useMemo(() => {
    if (!keyword) return []
    return barang
      .filter(
        (item) =>
          String(item.sku || '').toLowerCase().includes(keyword) ||
          String(item.nama || '').toLowerCase().includes(keyword)
      )
      .sort((a, b) => {
        const aAwal = String(a.sku || '').toLowerCase().startsWith(keyword)
        const bAwal = String(b.sku || '').toLowerCase().startsWith(keyword)
        if (aAwal !== bAwal) return aAwal ? -1 : 1
        return String(a.sku || '').localeCompare(String(b.sku || ''))
      })
      .slice(0, MAKS_HASIL)
  }, [barang, keyword])

  useEffect(() => {
    function handleClickLuar(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickLuar)
    return () => document.removeEventListener('mousedown', handleClickLuar)
  }, [])

  function pilih(item) {
    onSelect(item.sku)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }

    if (!keyword) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setAktif((prev) => Math.min(prev + 1, hasil.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAktif((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hasil[aktif]) pilih(hasil[aktif])
    }
  }

  const popupTampil = open && keyword.length > 0

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />

      <label htmlFor={`${listId}-input`} className="sr-only">
        Cari SKU atau nama barang
      </label>

      <input
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={popupTampil}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          popupTampil && hasil[aktif] ? `${listId}-${aktif}` : undefined
        }
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setAktif(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={selectedSku ? `SKU aktif: ${selectedSku}` : 'Cari SKU'}
        className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8A7CD9] focus:border-[#8A7CD9]"
      />

      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery('')
            setOpen(false)
          }}
          aria-label="Hapus ketikan"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
        >
          <X size={13} />
        </button>
      )}

      {popupTampil && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-30 w-full min-w-[260px] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1"
        >
          {hasil.length > 0 ? (
            hasil.map((item, index) => (
              <li
                key={item.id ?? item.sku}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === aktif}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pilih(item)
                }}
                onMouseEnter={() => setAktif(index)}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer ${
                  index === aktif ? 'bg-[#EDEAFF]' : ''
                }`}
              >
                <ProductImage item={item} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {item.nama}
                  </p>
                  <p className="text-[10px] text-slate-400">SKU: {item.sku}</p>
                </div>
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-xs text-slate-400 text-center">
              SKU atau barang tidak ditemukan.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

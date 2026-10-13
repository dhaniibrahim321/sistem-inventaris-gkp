const JUMLAH_GARIS = 4
const TINGGI_PLOT = 200
const LEBAR_KOLOM_MIN = 48

function hitungSkala(maxData) {
  if (maxData <= 0) return { step: 1, max: JUMLAH_GARIS }

  const mentah = maxData / JUMLAH_GARIS
  const magnitudo = 10 ** Math.floor(Math.log10(mentah))
  const norm = mentah / magnitudo
  const rapi = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  const step = Math.max(1, Math.ceil(rapi * magnitudo))

  return { step, max: step * JUMLAH_GARIS }
}

function labelTanggal(tanggal) {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  })
}

function Batang({ nilai, max, warna, nama }) {
  const persen = max > 0 ? (nilai / max) * 100 : 0

  return (
    <div className="relative h-full w-3.5" aria-label={`${nama}: ${nilai}`}>
      {nilai > 0 && (
        <>
          <span
            className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-600 leading-none"
            style={{ bottom: `calc(${persen}% + 3px)` }}
          >
            {nilai}
          </span>
          <div
            className={`absolute bottom-0 w-full rounded-t-md ${warna}`}
            style={{ height: `${persen}%` }}
          />
        </>
      )}
    </div>
  )
}

export default function StatistikChart({ data }) {
  const maxData = Math.max(0, ...data.flatMap((d) => [d.gudang, d.display]))
  const { step, max } = hitungSkala(maxData)
  const garis = Array.from({ length: JUMLAH_GARIS + 1 }, (_, i) => i * step)

  return (
    <div className="mt-4">
      <p className="text-[10px] text-slate-400 mb-1.5 pl-1">Jumlah (pcs)</p>

      <div className="flex">
        <div
          className="relative w-9 shrink-0"
          style={{ height: TINGGI_PLOT }}
          aria-hidden="true"
        >
          {garis.map((nilai, i) => (
            <span
              key={nilai}
              className="absolute right-2 translate-y-1/2 text-[10px] text-slate-400 leading-none"
              style={{ bottom: `${(i / JUMLAH_GARIS) * 100}%` }}
            >
              {nilai}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div style={{ minWidth: data.length * LEBAR_KOLOM_MIN }}>
            <div className="relative" style={{ height: TINGGI_PLOT }}>
              {garis.map((nilai, i) => (
                <div
                  key={nilai}
                  className={`absolute left-0 right-0 border-t border-dashed ${
                    i === 0 ? 'border-slate-300' : 'border-slate-200'
                  }`}
                  style={{ bottom: `${(i / JUMLAH_GARIS) * 100}%` }}
                />
              ))}

              <div className="absolute inset-0 flex">
                {data.map((d) => (
                  <div
                    key={d.tanggal}
                    title={`${labelTanggal(d.tanggal)} — Masuk gudang: ${d.gudang}, Ke display: ${d.display}`}
                    className="flex-1 h-full flex items-end justify-center gap-1"
                  >
                    <Batang
                      nilai={d.gudang}
                      max={max}
                      warna="bg-violet-400"
                      nama="Gudang"
                    />
                    <Batang
                      nilai={d.display}
                      max={max}
                      warna="bg-pink-400"
                      nama="Ke display"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex mt-2">
              {data.map((d) => (
                <p
                  key={d.tanggal}
                  className="flex-1 text-[10px] text-slate-500 text-center whitespace-nowrap"
                >
                  {labelTanggal(d.tanggal)}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-right text-[10px] text-slate-400 mt-1">Tanggal</p>
    </div>
  )
}

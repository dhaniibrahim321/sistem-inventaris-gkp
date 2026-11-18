import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  Package,
  Warehouse,
  Store,
  ArrowRight,
  CalendarDays,
  MapPin,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import {
  buatEntriRiwayat,
  tambahRiwayat,
} from "../services/riwayatService";
import { transferKloterGudangKeDisplay } from "../services/barangService";
import {
  getKloterList,
  getStokView,
  kloterDefault,
} from "../utils/kloterHelpers";
import {
  formatTanggal,
  todayISOString,
} from "../utils/dateHelpers";
import { getDaftarStok } from "../services/stokService";
import { simpanPergerakan } from "../services/pergerakanService";

export default function PergerakanPage({
  barang = [],
  setBarang,
  setRiwayat,
}) {
  const [dbBarang, setDbBarang] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function muatDataBarang() {
    setLoading(true);
    try {
      const res = await getDaftarStok({ limit: 1000 });
      if (res?.data && Array.isArray(res.data)) {
        const mapped = res.data.map((b) => ({
          id: b.id_barang,
          sku: b.sku,
          nama: b.nama_barang,
          kategori: b.kategori,
          satuan: b.satuan || "pcs",
          gambar: b.foto_url || null,
          stokGudang: Number(b.stok_gudang || 0),
          stokDisplay: Number(b.stok_display || 0),
          totalStok: Number(b.total || 0),
          kloter: (b.kloter || []).map((k) => ({
            id: k.id_kloter,
            nomor: String(k.nama_kloter || "").replace(/[^0-9]/g, "") || k.nama_kloter || 1,
            namaKloter: k.nama_kloter,
            tanggalKadaluarsa: k.tanggal_kedaluwarsa,
            stokGudang: Number(k.stok_gudang || 0),
            stokDisplay: Number(k.stok_display || 0),
            jumlahAwal: Number(k.jumlah_awal || (k.stok_gudang + k.stok_display) || 0),
            sisaHari: k.sisa_hari,
          })),
        }));
        setDbBarang(mapped);
      }
    } catch (err) {
      console.warn("Gagal memuat barang dari backend:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    muatDataBarang();
  }, []);

  const barangAktif = dbBarang ?? barang;

  const location = useLocation();
  const barangIdAwal = location.state?.barangId ?? null;
  const barangAwal =
    barangAktif.find((item) => item.id === barangIdAwal) || null;

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(
    barangAwal ? barangAwal.id : null
  );
  const [kloterId, setKloterId] = useState(() => {
    const awal = barangAwal
      ? kloterDefault(getKloterList(barangAwal))
      : null;
    return awal ? String(awal.id) : "";
  });

  useEffect(() => {
    if (barangIdAwal && !selectedId && barangAktif.length > 0) {
      const match = barangAktif.find((item) => item.id === barangIdAwal);
      if (match) {
        setSelectedId(match.id);
        const awal = kloterDefault(getKloterList(match));
        setKloterId(awal ? String(awal.id) : "");
      }
    }
  }, [barangIdAwal, barangAktif, selectedId]);

  const selectedBarang =
    barangAktif.find((item) => item.id === selectedId) || null;

  const [tanggal, setTanggal] = useState(todayISOString());
  const [jumlah, setJumlah] = useState("");
  const [rakDisplay, setRakDisplay] = useState("");
  const [catatan, setCatatan] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredBarang = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) {
      return barangAktif;
    }

    return barangAktif.filter((item) => {
      const nama = String(
        item.nama ||
          item.namaBarang ||
          item.name ||
          ""
      ).toLowerCase();

      const sku = String(item.sku || "").toLowerCase();

      return nama.includes(keyword) || sku.includes(keyword);
    });
  }, [barangAktif, search]);

  const kloterList = getKloterList(selectedBarang);

  const stokView = selectedBarang
    ? getStokView(selectedBarang, kloterId || "all")
    : { gudang: 0, display: 0, total: 0, kloter: null };

  const stokGudang = stokView.gudang;
  const stokDisplay = stokView.display;
  const stokTotal = stokView.total;

  useEffect(() => {
    if (selectedId === null) return;
    document
      .getElementById(`pilih-barang-${selectedId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const handlePilihBarang = (item) => {
    setSelectedId(item.id);
    const awal = kloterDefault(getKloterList(item));
    setKloterId(awal ? String(awal.id) : "");
    setError("");
    setSuccess("");
    setJumlah("");
    setRakDisplay("");
    setCatatan("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedBarang) {
      setError("Silakan pilih barang terlebih dahulu.");
      return;
    }

    if (kloterList.length === 0) {
      setError(
        "Barang ini belum punya kloter. Catat barang masuk terlebih dahulu."
      );
      return;
    }

    if (!stokView.kloter) {
      setError("Pilih kloter yang akan dipindahkan.");
      return;
    }

    const jumlahTransfer = Number(jumlah);

    if (!jumlah || jumlahTransfer <= 0) {
      setError("Jumlah barang yang dipindahkan harus lebih dari 0.");
      return;
    }

    if (jumlahTransfer > stokGudang) {
      setError(
        `Stok gudang Kloter ${stokView.kloter.nomor} tidak mencukupi. Stok gudang kloter ini ${stokGudang} barang.`
      );
      return;
    }

    if (!rakDisplay.trim()) {
      setError("Letak rak display wajib diisi.");
      return;
    }

    if (!tanggal) {
      setError("Tanggal pengisian wajib diisi.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        id_kloter: Number(stokView.kloter.id),
        jumlah_pindah: jumlahTransfer,
        tanggal_pindah: tanggal,
        letak_rak: rakDisplay.trim(),
        catatan: catatan.trim() || undefined,
      };
      await simpanPergerakan(payload);

      if (setBarang) {
        setBarang((prev) =>
          transferKloterGudangKeDisplay(
            prev,
            selectedBarang.id,
            stokView.kloter.id,
            jumlahTransfer
          )
        );
      }

      if (setRiwayat) {
        const namaBarang =
          selectedBarang.nama ||
          selectedBarang.namaBarang ||
          selectedBarang.name ||
          "-";

        const sku = selectedBarang.sku || "-";
        const satuan = selectedBarang.satuan || "pcs";
        const catatanTrim = catatan.trim();

        setRiwayat((prev) =>
          tambahRiwayat(
            prev,
            buatEntriRiwayat({
              jenis: "pergerakan",
              sku,
              nama: namaBarang,
              tanggalTransaksi: tanggal,
              jumlah: jumlahTransfer,
              kloter: stokView.kloter.nomor,
              keterangan:
                `Dipindahkan +${jumlahTransfer} ${satuan} dari Gudang ke Display (Kloter ${stokView.kloter.nomor}). ` +
                `Rak display: ${rakDisplay.trim()}. ` +
                `Tanggal pengisian: ${tanggal}. ` +
                `Stok gudang ${stokGudang} → ${stokGudang - jumlahTransfer}, ` +
                `display ${stokDisplay} → ${stokDisplay + jumlahTransfer}.` +
                (catatanTrim ? ` Catatan: ${catatanTrim}` : ""),
            })
          )
        );
      }

      setSuccess(
        `${jumlahTransfer} barang (Kloter ${stokView.kloter.nomor}) berhasil dipindahkan dari Gudang ke Display.`
      );

      setJumlah("");
      setRakDisplay("");
      setCatatan("");
      await muatDataBarang();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Gagal memproses pergerakan barang.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Pergerakan Barang
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Memindahkan stok barang dari gudang ke display.
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 size={20} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Pilih Barang
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Pilih barang yang akan dipindahkan ke display.
            </p>
          </div>

          <div className="p-5">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang atau SKU..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#8A7CD9] focus:ring-2 focus:ring-[#8A7CD9]/20"
              />
            </div>

            <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
                  <Loader2 size={32} className="animate-spin text-[#8A7CD9]" />
                  <p className="mt-3 text-sm">Memuat data barang...</p>
                </div>
              ) : filteredBarang.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <Package
                    size={40}
                    className="mx-auto text-gray-300"
                  />

                  <p className="mt-3 text-sm text-gray-500">
                    Barang tidak ditemukan.
                  </p>
                </div>
              ) : (
                filteredBarang.map((item) => {
                  const nama =
                    item.nama ||
                    item.namaBarang ||
                    item.name ||
                    "Tanpa nama";

                  const sku = item.sku || "-";

                  const isSelected =
                    selectedId === item.id;

                  return (
                    <button
                      key={item.id}
                      id={`pilih-barang-${item.id}`}
                      type="button"
                      onClick={() => handlePilihBarang(item)}
                      className={`w-full rounded-lg border p-4 text-left transition ${
                        isSelected
                          ? "border-[#8A7CD9] bg-[#EDEAFF]"
                          : "border-gray-200 bg-white hover:border-[#C2B6FE] hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                          {item.gambar ? (
                            <img
                              src={item.gambar}
                              alt={nama}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package
                              size={25}
                              className="text-gray-400"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-800">
                            {nama}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            SKU: {sku}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.kategori || "Tanpa kategori"}
                          </p>
                        </div>

                        {isSelected && (
                          <CheckCircle2
                            size={22}
                            className="shrink-0 text-[#5B528D]"
                          />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Transfer Stok
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Informasi stok barang yang dipilih.
              </p>
            </div>

            <div className="p-5">
              {!selectedBarang ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <Package
                    size={45}
                    className="mx-auto text-gray-300"
                  />

                  <p className="mt-3 font-medium text-gray-600">
                    Belum ada barang yang dipilih
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    Pilih barang dari daftar di sebelah kiri.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {selectedBarang.gambar ? (
                        <img
                          src={selectedBarang.gambar}
                          alt="Barang"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package
                          size={28}
                          className="text-gray-400"
                        />
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {selectedBarang.nama ||
                          selectedBarang.namaBarang ||
                          selectedBarang.name ||
                          "-"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        SKU: {selectedBarang.sku || "-"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {selectedBarang.kategori ||
                          "Tanpa kategori"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Warehouse size={17} />
                        Gudang
                      </div>

                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {stokGudang}
                      </p>

                      <p className="text-xs text-gray-400">
                        Stok tersedia
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Store size={17} />
                        Display
                      </div>

                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {stokDisplay}
                      </p>

                      <p className="text-xs text-gray-400">
                        Stok tersedia
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Package size={17} />
                        Total
                      </div>

                      <p className="mt-2 text-2xl font-bold text-gray-800">
                        {stokTotal}
                      </p>

                      <p className="text-xs text-gray-400">
                        Seluruh stok
                      </p>
                    </div>
                  </div>

                  <div className="my-5 flex items-center justify-center gap-3 text-sm font-medium text-gray-500">
                    <span className="rounded-lg bg-gray-100 px-4 py-2">
                      Gudang
                    </span>

                    <ArrowRight
                      size={22}
                      className="text-[#5B528D]"
                    />

                    <span className="rounded-lg bg-[#EDEAFF] px-4 py-2 text-[#5B528D]">
                      Display
                    </span>
                  </div>

                  <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="kloter-pergerakan"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Kloter
                      </label>

                      <select
                        id="kloter-pergerakan"
                        value={kloterId}
                        onChange={(e) => {
                          setKloterId(e.target.value);
                          setJumlah("");
                          setError("");
                        }}
                        disabled={kloterList.length === 0}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#8A7CD9] focus:ring-2 focus:ring-[#8A7CD9]/20 disabled:bg-gray-50"
                      >
                        {kloterList.length === 0 && (
                          <option value="">
                            Belum ada kloter
                          </option>
                        )}

                        {kloterList.map((k) => (
                          <option key={k.id} value={String(k.id)}>
                            Kloter {k.nomor} — Exp.{" "}
                            {formatTanggal(k.tanggalKadaluarsa)} — gudang {k.stokGudang}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Tanggal Pengisian
                      </label>

                      <div className="relative">
                        <CalendarDays
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="date"
                          value={tanggal}
                          onChange={(e) =>
                            setTanggal(e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#8A7CD9] focus:ring-2 focus:ring-[#8A7CD9]/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Jumlah ke Display
                      </label>

                      <input
                        type="number"
                        min="1"
                        max={stokGudang}
                        value={jumlah}
                        onChange={(e) =>
                          setJumlah(e.target.value)
                        }
                        placeholder="Masukkan jumlah barang"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#8A7CD9] focus:ring-2 focus:ring-[#8A7CD9]/20"
                      />

                      <p className="mt-1 text-xs text-gray-400">
                        Maksimal {stokGudang} barang dari kloter ini
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Letak Rak Display
                      </label>

                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="text"
                          value={rakDisplay}
                          onChange={(e) =>
                            setRakDisplay(e.target.value)
                          }
                          placeholder="Contoh: Rak Display A-01"
                          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#8A7CD9] focus:ring-2 focus:ring-[#8A7CD9]/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Catatan
                      </label>

                      <div className="relative">
                        <FileText
                          size={18}
                          className="absolute left-3 top-3 text-gray-400"
                        />

                        <textarea
                          rows="3"
                          value={catatan}
                          onChange={(e) =>
                            setCatatan(e.target.value)
                          }
                          placeholder="Tambahkan catatan jika diperlukan..."
                          className="w-full resize-none rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#8A7CD9] focus:ring-2 focus:ring-[#8A7CD9]/20"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5B528D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a4275] focus:outline-none focus:ring-2 focus:ring-[#C2B6FE] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        "Simpan Pergerakan Barang"
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

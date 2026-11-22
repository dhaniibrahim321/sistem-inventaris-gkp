
const barangModel = require('../models/barangModel');
const AppError = require('../utils/AppError');
const {
  asyncHandler,
  requireString,
  optionalString
} = require('../utils/helpers');

// GET: Menampilkan semua barang
const getAll = asyncHandler(async (req, res) => {
  const { q = '', kategori = '' } = req.query;
  const data = await barangModel.getAll(q, kategori);

  res.json({
    success: true,
    data
  });
});

// GET: Detail barang
const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID barang tidak valid.', 400);
  }

  const data = await barangModel.getById(id);

  if (!data) {
    throw new AppError('Barang tidak ditemukan.', 404);
  }

  res.json({
    success: true,
    data
  });
});

// POST: Menambahkan barang
const create = asyncHandler(async (req, res) => {
  const data = {
    sku: requireString(req.body.sku, 'SKU'),
    nama: requireString(req.body.nama_barang, 'Nama barang'),
    kategori: requireString(req.body.kategori, 'Kategori'),
    foto: optionalString(req.body.foto_url),
    oleh: req.user.nama
  };

  const id = await barangModel.create(data);

  res.status(201).json({
    success: true,
    message: 'Barang berhasil ditambahkan.',
    id_barang: id
  });
});

// PUT: Mengubah barang
const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID barang tidak valid.', 400);
  }

  const data = {
    sku: requireString(req.body.sku, 'SKU'),
    nama: requireString(req.body.nama_barang, 'Nama barang'),
    kategori: requireString(req.body.kategori, 'Kategori'),
    foto: optionalString(req.body.foto_url),
    oleh: req.user.nama
  };

  const updated = await barangModel.update(id, data);

  if (!updated) {
    throw new AppError('Barang tidak ditemukan.', 404);
  }

  res.json({
    success: true,
    message: 'Barang berhasil diperbarui.'
  });
});

// DELETE: Soft delete barang
const softDelete = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('ID barang tidak valid.', 400);
  }

  const deleted = await barangModel.softDelete(id, req.user.nama);

  if (!deleted) {
    throw new AppError('Barang tidak ditemukan.', 404);
  }

  res.json({
    success: true,
    message: 'Barang berhasil dihapus.'
  });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  softDelete
};

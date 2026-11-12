
const riwayatModel = require('../models/riwayatModel');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../utils/helpers');

const getAll = asyncHandler(async (req, res) => {
  const data = await riwayatModel.getAll();

  return sendSuccess(res, {
    message: 'Riwayat aktivitas berhasil diambil.',
    data,
  });
});

module.exports = { getAll };

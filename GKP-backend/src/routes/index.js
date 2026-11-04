const router = require('express').Router();

const barangRoutes = require('./barang');
const riwayatRoutes = require('./riwayat');
const pergerakanRoutes = require('./pergerakan');
const barangMasukRoutes = require('./barangMasuk');

// Health Check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SIGKP API berjalan.'
  });
});

// Routes
router.use('/barang', barangRoutes);
router.use('/riwayat', riwayatRoutes);
router.use('/pergerakan', pergerakanRoutes);
router.use('/barang-masuk', barangMasukRoutes);

module.exports = router;
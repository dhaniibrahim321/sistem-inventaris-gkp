
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const riwayatController = require('../controllers/riwayatController');

// Autentikasi untuk seluruh endpoint riwayat
router.use(authenticate);

// GET: Daftar riwayat aktivitas
router.get('/', riwayatController.getAll);

module.exports = router;

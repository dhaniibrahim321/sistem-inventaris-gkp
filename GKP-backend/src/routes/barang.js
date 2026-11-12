
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const barangController = require('../controllers/barangController');

// Autentikasi untuk seluruh endpoint barang
router.use(authenticate);

// GET: Daftar barang
router.get('/', barangController.getAll);

// GET: Detail barang
router.get('/:id', barangController.getById);

// POST: Tambah barang
router.post('/', barangController.create);

// PUT: Ubah barang
router.put('/:id', barangController.update);

// DELETE: Soft delete barang
router.delete('/:id', barangController.softDelete);

module.exports = router;

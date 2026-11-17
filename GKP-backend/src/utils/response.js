// Format respons API yang seragam untuk seluruh endpoint:
// { "status": "success" | "error", "message": "...", "data": { ... } | null }

function sendSuccess(res, { statusCode = 200, message = 'Berhasil.', data = null } = {}) {
  return res.status(statusCode).json({ status: 'success', message, data })
}

function sendError(res, { statusCode = 500, message = 'Terjadi kesalahan pada server.', data = null } = {}) {
  return res.status(statusCode).json({ status: 'error', message, data })
}

module.exports = { sendSuccess, sendError }

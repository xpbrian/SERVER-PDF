const { Router } = require('express');
const router = Router();

const { pdfsController } = require('../controller/index.controller');

router.post('/generarPdf', pdfsController.generarPdfResultado);
router.post('/generarPdf2', pdfsController.generarPdfResultado2);


module.exports = router;
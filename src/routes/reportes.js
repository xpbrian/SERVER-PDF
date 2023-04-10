const { Router } = require('express');
const router = Router();

const { reportesController } = require('../controller/index.controller');


router.post('/desertadosGenerados', reportesController.getReporteDesertadosGenerados);
router.post('/desertadosGeneradosTotal', reportesController.getReporteDesertadosTotal);

router.post('/primerReporte', reportesController.primerReporte);
router.post('/primerReporteDetalle', reportesController.primerReporteDetalle);
router.post('/primerReporteAplehoo', reportesController.primerReporteAplehoo);

router.post('/reporteGeneral', reportesController.reporteGeneral);

module.exports = router;
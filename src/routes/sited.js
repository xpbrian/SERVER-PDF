const { Router } = require('express');
const router = Router();

const { sitedController } = require('../controller/index.controller');

router.get('/listaAtenciones/:id', sitedController.getListaAtenciones);

router.get('/getsqlModeGroupby', sitedController.getsqlModeGroupby);

router.post('/getSited', sitedController.getListaAtencionesSited);
module.exports = router;
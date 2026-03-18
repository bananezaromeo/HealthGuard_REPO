const express = require('express');
const { storeHealthData, detectSeizure, detectCardiac } = require('../controllers/wearableController');

const router = express.Router();

router.post('/health-data', storeHealthData);
router.post('/seizure-detected', detectSeizure);
router.post('/cardiac-alert', detectCardiac);

module.exports = router;

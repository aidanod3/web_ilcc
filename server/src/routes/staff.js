/*
 * staff.js — admin-only management of the TA/admin list.
 * Mounted at /api/staff behind requireRole('admin').
 */
const express = require('express');
const staff = require('../services/staff');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ staff: staff.list(), me: req.user.email });
});

router.post('/', (req, res, next) => {
  try {
    const { email, role } = req.body || {};
    const row = staff.add(email, role, req.user.email);
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.delete('/:email', (req, res, next) => {
  try {
    staff.remove(req.params.email, req.user.email);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;

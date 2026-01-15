const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authentication');

const {
  getEventsByDate,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllUserEvents,
} = require('../controllers/events')


router.get('/', getEventsByDate);
router.get('/my-events', authenticateUser, getAllUserEvents)
router.get('/:id', getEvent)

// Protected routes
router.post('/', authenticateUser, createEvent);
router.put('/:id', authenticateUser, updateEvent);
router.delete('/:id', authenticateUser, deleteEvent);

module.exports = router;

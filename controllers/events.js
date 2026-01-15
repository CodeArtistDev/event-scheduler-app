const Event = require('../models/Event')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError, ConflictError } = require('../errors')


const getEventsByDate = async (req, res) => {
  const { date } = req.query

  let query = {}

  if (date) {
    const queryDate = new Date(date)

    const startOfDay = new Date(queryDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(queryDate)
    endOfDay.setHours(23, 59, 59, 999)

    query.date = {
      $gte: startOfDay,
      $lte: endOfDay,
    }
  }

  const events = await Event.find(query)
    .populate('createdBy', 'name') 
    .sort({ date: 1, startTime: 1 })

  res.status(StatusCodes.OK).json({
    events,
    count: events.length,
  })
}

const getEvent = async (req, res) => {
  const { id: eventId } = req.params

  const event = await Event.findById(eventId).populate('createdBy', 'name')

  if (!event) {
    throw new NotFoundError(`No event with id ${eventId}`)
  }

  res.status(StatusCodes.OK).json({ event })
}


const createEvent = async (req, res) => {
  const { title, description, date, startTime, endTime } = req.body


  if (!title || !date || !startTime || !endTime) {
    throw new BadRequestError(
      'Please provide title, date, startTime, and endTime'
    )
  }

  const { hasOverlap, conflictingEvent } = await Event.checkOverlap(
    date,
    startTime,
    endTime
  )

  if (hasOverlap) {
    throw new ConflictError(
      `Event overlaps with existing event "${conflictingEvent.title}" (${conflictingEvent.startTime} - ${conflictingEvent.endTime})`
    )
  }


  req.body.createdBy = req.user.userId


  const event = await Event.create(req.body)

  res.status(StatusCodes.CREATED).json({ event })
}


const updateEvent = async (req, res) => {
  const {
    body: { title, date, startTime, endTime },
    user: { userId },
    params: { id: eventId },
  } = req


  if (title === '') {
    throw new BadRequestError('Title field cannot be empty')
  }


  const existingEvent = await Event.findOne({
    _id: eventId,
    createdBy: userId,
  })

  if (!existingEvent) {
    throw new NotFoundError(`No event with id ${eventId}`)
  }

 
  const checkDate = date || existingEvent.date
  const checkStartTime = startTime || existingEvent.startTime
  const checkEndTime = endTime || existingEvent.endTime

  const { hasOverlap, conflictingEvent } = await Event.checkOverlap(
    checkDate,
    checkStartTime,
    checkEndTime,
    eventId 
  )

  if (hasOverlap) {
    throw new ConflictError(
      `Event overlaps with existing event "${conflictingEvent.title}" (${conflictingEvent.startTime} - ${conflictingEvent.endTime})`
    )
  }


  const event = await Event.findOneAndUpdate(
    { _id: eventId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  )

  res.status(StatusCodes.OK).json({ event })
}


const deleteEvent = async (req, res) => {
  const {
    user: { userId },
    params: { id: eventId },
  } = req

  const event = await Event.findOneAndDelete({
    _id: eventId,
    createdBy: userId,
  })

  if (!event) {
    throw new NotFoundError(`No event with id ${eventId}`)
  }

  res.status(StatusCodes.OK).json({ msg: 'Event deleted successfully' })
}


const getAllUserEvents = async (req, res) => {
  const events = await Event.find({ createdBy: req.user.userId }).sort({
    date: 1,
    startTime: 1,
  })

  res.status(StatusCodes.OK).json({
    events,
    count: events.length,
  })
}

module.exports = {
  getEventsByDate,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getAllUserEvents,
}

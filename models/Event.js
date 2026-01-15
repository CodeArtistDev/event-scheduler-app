const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide event title'],
    maxlength: 100,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 100,
    trim: true,
  },
  date: {
    type: Date,
    required: [true, 'Please provide event date'],
  },
  startTime: {
    type: String,
    required: [true, 'Please provide start time'],
    match: [
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Please provide valid time format (HH:MM)',
    ],
  },
  endTime: {
    type: String,
    required: [true, 'Please provide end time'],
    match: [
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Please provide valid time format (HH:MM)',
    ],
  },
  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please provide user'],
  },
},
{ timestamps: true }
);

EventSchema.statics.timeToMinutes = function (timeStr) {
  const [ hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

EventSchema.statics.checkOverlap = async function (
  date,
  startTime,
  endTime,
  excludeEventId = null
) {
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  };

  if(excludeEventId) {
    query._id = { $ne: excludeEventId };
  }

  const eventsOnSameDay = await this.find(query);

  const newStartMinutes = this.timeToMinutes(startTime);
  const newEndMinutes = this.timeToMinutes(endTime);

  for (const event of eventsOnSameDay) {
    const existingStartMinutes = this.timeToMinutes(event.startTime);
    const existingEndMinutes = this.timeToMinutes(event.endTime);

    if(
      newStartMinutes < existingEndMinutes &&
      existingStartMinutes < newEndMinutes
    ){
      return {
        hasOverlap: true,
        conflictingEvent: event,
      };
    }
  }
  
return { hasOverlap: false };
};

EventSchema.pre('validate', function (next) {
  if(this.startTime && this.endTime) {
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.endTime.split(':').map(Number);

    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;

    if(endTotal <= startTotal){
      this.invalidate('endTime', 'End time must be after start time');
    }
  }
  next();
});

EventSchema.index({ date: 1 });
EventSchema.index({ createdBy: 1, date: 1 });

module.exports = mongoose.model('Event', EventSchema);
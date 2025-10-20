// Commitment Tracker Service

const { Commitment } = require('../models/commitment');
const { sendReminder } = require('../utils/reminder');
const moment = require('moment');

class CommitmentTracker {
  constructor() {
    this.commitments = [];
  }

  async addCommitment(commitment) {
    const newCommitment = new Commitment(commitment);
    await newCommitment.save();
    this.commitments.push(newCommitment);
    this.scheduleReminders(newCommitment);
  }

  scheduleReminders(commitment) {
    const deadlines = [
      moment(commitment.deadline).subtract(2, 'days'),
      moment(commitment.deadline).subtract(1, 'days'),
      moment(commitment.deadline),
      moment(commitment.deadline).add(1, 'hours')
    ];

    deadlines.forEach((time) => {
      sendReminder(commitment, time);
    });
  }

  async getActiveCommitments() {
    return await Commitment.find({ status: 'Pending' }).sort({ deadline: 1 });
  }

  async getCommitmentHistory() {
    return await Commitment.find();
  }
}

module.exports = new CommitmentTracker();
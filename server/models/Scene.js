const mongoose = require('mongoose');

const SceneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  version: {
    type: Number,
    default: 2
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Scene', SceneSchema);
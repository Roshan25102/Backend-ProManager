const mongoose = require("mongoose");

const checklistSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: Number,
      enum: [1, 2, 3], // Priority levels
      required: true,
    },
    progress: {
      type: String,
      enum: ["Backlog", "To do", "In progress", "Done"],
      default: "To do",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to User model
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to User model
      },
    ],
    checklist: {
      type: [checklistSchema],
      required: true,
      validate: {
        validator: (value) => value.length > 0, // Ensure checklist has at least one item
        message: "Checklist must contain at least one item.",
      },
    },
    dueDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);

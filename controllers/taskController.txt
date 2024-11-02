const Task = require("../model/taskModel");
const User = require("../model/User");

// Create Task
exports.createTask = async (req, res) => {
  try {
    const { title, priority, assignedUsers, checklist, dueDate } = req.body;
    const task = new Task({
      title,
      priority,
      checklist,
      dueDate,
      createdBy: req.user.id, // Assuming the user is authenticated
      assignedUsers: assignedUsers || [], // Use assignedUsers array
    });

    await task.save();

    // Add task to the creator's profile
    await User.findByIdAndUpdate(req.user.id, { $push: { tasks: task._id } });

    // Add task to each assigned user's profile
    for (const assignedUser of assignedUsers) {
      await User.findByIdAndUpdate(assignedUser.userId, {
        $push: { tasks: task._id },
      });
    }

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
    console.log(error);
  }
};

// Fetch Tasks for Logged-In User
exports.getUserTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      "assignedUsers.userId": req.user.id,
    }).populate("createdBy", "username");
    res.status(200).json({ tasks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
    console.log(error);
  }
};

// Update Task Progress
exports.updateTaskProgress = async (req, res) => {
  try {
    const { taskId, progress } = req.body;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Optional: Find the specific assigned user progress if tasks are user-specific
    // For general task progress update:
    task.progress = progress;
    await task.save();

    res.status(200).json({ message: "Task progress updated", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
    console.log(error);
  }
};

// Update Task Details
exports.updateTask = async (req, res) => {
  try {
    const { taskId, updates } = req.body;

    // Ensure taskId is provided
    if (!taskId) {
      return res.status(400).json({ message: "Task ID is required" });
    }

    // Find and update the task by its ID
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Apply the updates
    Object.keys(updates).forEach((key) => {
      task[key] = updates[key];
    });

    // Save the updated task
    await task.save();

    res.status(200).json({ message: "Task details updated", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


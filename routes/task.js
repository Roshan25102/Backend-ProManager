// routes/task.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware"); // Authorization middleware
const Task = require("../model/Task");
const User = require("../model/User");

const router = express.Router();

// Task creation route
router.post("/create", authMiddleware, async (req, res) => {
  const { title, priority, progress, assignedTo, checklist, dueDate } =
    req.body;

  try {
    // Validate required fields
    if (!title || !priority || !checklist || !checklist.length) {
      return res
        .status(400)
        .json({ message: "Title, priority, and checklist are required." });
    }

    // Transform checklist items to include "completed" status
    // const formattedChecklist = checklist.map((item) => ({
    //   task: item,
    //   completed: false,
    // }));

    // Collect all unique user IDs (logged-in user + assigned users) to create separate tasks
    const userIds = new Set([req.user.userId, ...(assignedTo || [])]);
    console.log(req.user.userId);

    // Create a task for each unique user ID
    const tasks = [];
    for (const userId of userIds) {
      const task = new Task({
        title,
        priority,
        progress,
        assignedTo: [userId],
        checklist,
        dueDate,
        createdBy: req.user.userId,
      });
      tasks.push(task);
      await task.save();
    }

    res.status(201).json({ message: "Tasks created successfully", tasks });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.get("/my-tasks", authMiddleware, async (req, res) => {
  try {
    // Fetch tasks assigned to the logged-in user
    const userTasks = await Task.find({ assignedTo: req.user.userId });

    // Populate `assignedTo` field with user details and generate initials
    const tasksWithInitials = await Promise.all(
      userTasks.map(async (task) => {
        // Initialize initials as null
        let initials = null;

        // Check if `assignedTo` user is the same as `createdBy`
        if (!task.assignedTo[0].equals(task.createdBy)) {
          // Fetch the assigned user's details
          const assignedUser = await User.findById(task.assignedTo[0]);

          if (assignedUser) {
            const nameParts = assignedUser.name.split(" ");
            if (nameParts.length === 1) {
              // If one word, take the first two letters
              initials = nameParts[0].substring(0, 2).toUpperCase();
            } else {
              // If two words, take the first letter of each
              initials = `${nameParts[0].charAt(0)}${nameParts[1].charAt(
                0
              )}`.toUpperCase();
            }
          }
        }

        // Return task data with initials
        return {
          ...task.toObject(),
          initials,
        };
      })
    );

    res.status(200).json({ tasks: tasksWithInitials });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Route to get a single task by ID
router.get("/:taskId", async (req, res) => {
  const { taskId } = req.params;

  try {
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// General task update route, including checklist updates
router.put("/update/:taskId", authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const { title, priority, progress, checklist, dueDate } = req.body;

  try {
    // Find the task by ID
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if the user is authorized (user should be assigned to the task)
    if (!task.assignedTo.includes(req.user.userId)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to modify this task" });
    }

    // Update task fields if provided
    if (title) task.title = title;
    if (priority) task.priority = priority;
    if (progress) task.progress = progress;
    if (dueDate) task.dueDate = dueDate;

    // Update specific checklist items if provided
    if (checklist) {
      checklist.forEach((updatedItem) => {
        const item = task.checklist.id(updatedItem._id);
        if (item) {
          item.task = updatedItem.task || item.task;
          item.completed =
            updatedItem.completed !== undefined
              ? updatedItem.completed
              : item.completed;
        }
      });
    }

    // Save the updated task
    await task.save();

    res.json({ message: "Task updated successfully", task });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Task deletion route
router.delete("/delete/:taskId", authMiddleware, async (req, res) => {
  const { taskId } = req.params;

  try {
    // Find the task by ID
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if the user is authorized (user should be assigned to the task)
    if (!task.assignedTo.includes(req.user.userId)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this task" });
    }

    // Delete the task
    await Task.deleteOne({ _id: taskId });

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
    console.log(error);
  }
});

module.exports = router;

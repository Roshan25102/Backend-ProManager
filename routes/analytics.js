// routes/analytics.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware"); // Ensure user is authenticated
const Task = require("../model/Task");

const router = express.Router();

// Route to get task analytics for logged-in user
router.get("/task-analytics", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId; // Get the logged-in user's ID

    // Fetch task analytics data
    const tasks = await Task.aggregate([
      // Match tasks assigned to the logged-in user
      { $match: { assignedTo: userId } },

      // Group by different fields to get counts
      {
        $facet: {
          progressCounts: [
            { $group: { _id: "$progress", count: { $sum: 1 } } },
          ],
          priorityCounts: [
            { $group: { _id: "$priority", count: { $sum: 1 } } },
          ],
          dueDateTasks: [
            { $match: { dueDate: { $exists: true, $ne: null } } },
            { $count: "count" },
          ],
        },
      },
    ]);

    // Extract the counts from the aggregation result
    const progressCounts = tasks[0].progressCounts.reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      { Backlog: 0, "To do": 0, "In progress": 0, Done: 0 }
    );

    const priorityCounts = tasks[0].priorityCounts.reduce(
      (acc, item) => {
        // Map the priority numbers to their corresponding labels
        switch (item._id) {
          case 1:
            acc.High = item.count; // Priority 1 is High
            break;
          case 2:
            acc.Moderate = item.count; // Priority 2 is Moderate
            break;
          case 3:
            acc.Low = item.count; // Priority 3 is Low
            break;
          default:
            break;
        }
        return acc;
      },
      { High: 0, Moderate: 0, Low: 0 }
    );

    const dueDateCount = tasks[0].dueDateTasks.length
      ? tasks[0].dueDateTasks[0].count
      : 0;

    res.status(200).json({
      progress: {
        backlog: progressCounts.Backlog,
        todo: progressCounts["To do"],
        inProgress: progressCounts["In progress"],
        done: progressCounts.Done,
      },
      priority: {
        high: priorityCounts.High,
        moderate: priorityCounts.Moderate,
        low: priorityCounts.Low,
      },
      dueDateTasks: dueDateCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;

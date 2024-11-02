const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../model/User");
const Task = require("../model/Task");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,

        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// User list endpoint
router.get("/userlist", authMiddleware, async (req, res) => {
  try {
    // Exclude the logged-in user by using the userId from the request
    const users = await User.find({ _id: { $ne: req.user.userId } }).select(
      "_id name email"
    );

    const formattedUsers = users.map((user) => {
      const name = user.name || ""; // Default to empty string if name is undefined
      const nameParts = name.split(" ");

      const initials =
        nameParts.length > 1
          ? nameParts[0][0].toUpperCase() + nameParts[1][0].toUpperCase()
          : name.slice(0, 2).toUpperCase();

      return {
        userId: user._id,
        initials,
        email: user.email,
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Assuming necessary imports and middleware are already set up
router.post("/addPeople", authMiddleware, async (req, res) => {
  const { newAssigneeId } = req.body; // Getting new assignee ID from the request

  try {
    // Fetch all tasks assigned to the logged-in user
    const userTasks = await Task.find({ assignedTo: req.user.userId });

    const newTasks = userTasks.map((task) => {
      const { _id, title, priority, progress, createdBy, checklist, dueDate } =
        task;

      // Create a new task object with the new assignee
      return {
        title,
        priority,
        progress,
        createdBy,
        assignedTo: [newAssigneeId], // Assign the new user
        checklist,
        dueDate,
      };
    });

    // Save the new tasks to the database
    const createdTasks = await Task.insertMany(newTasks);

    res.status(201).json({
      message: "Tasks successfully assigned to the new user.",
      tasks: createdTasks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.put("/update", authMiddleware, async (req, res) => {
  const { name, email, oldPassword, newPassword } = req.body;

  // Check how many fields are being updated
  const fieldsToUpdate = [name, email, oldPassword && newPassword].filter(
    Boolean
  ).length;

  // Allow only one field to be updated at a time
  if (fieldsToUpdate > 1) {
    return res
      .status(400)
      .json({ message: "Only one field can be updated at a time." });
  }

  try {
    const user = await User.findById(req.user.userId);

    if (name) {
      user.name = name;
    } else if (email) {
      user.email = email;
    } else if (oldPassword && newPassword) {
      const isMatch = await user.matchPassword(oldPassword);
      if (!isMatch) {
        return res.status(401).json({ message: "Old password is incorrect." });
      }
      user.password = newPassword; // Assuming the password hashing logic is handled in the User model
    }

    await user.save();
    res.status(200).json({ message: "User info updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

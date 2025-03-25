import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { StreamChat } from "stream-chat";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/users.js";
// import http from 'http';
// import socketSetup from './socketServer.js';
// import chatRoutes from './routes/chat.js';

dotenv.config();

const app = express();

/* CONFIGURATION */
app.use(
  cors({
    origin: "http://localhost:5173", // Adjust to match your frontend URL
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json());

// Stream Chat setup
const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("STREAM_API_KEY and STREAM_API_SECRET must be set in .env");
  process.exit(1);
}

const chatClient = StreamChat.getInstance(apiKey, apiSecret);
console.log("API Key is set:", !!process.env.STREAM_API_KEY);
console.log("API Secret is set:", !!process.env.STREAM_API_SECRET);

// Create token and upsert user
app.post("/create-token", async (req, res) => {
  try {
    const { userId, username } = req.body;

    if (!userId || !username) {
      return res.status(400).json({ error: "User ID and Username are required" });
    }

    const token = chatClient.createToken(userId);

    // Ensure user exists before upserting
    const userResponse = await chatClient.queryUsers({ id: userId });
    if (userResponse.users.length === 0) {
      await chatClient.upsertUser({
        id: userId,
        name: username,
        role: "moderator", // Ensure role is valid
      });
    }

    res.json({ token, userId });
  } catch (error) {
    console.error("Error creating token:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create channel for a user
app.post("/create-channel", async (req, res) => {
  try {
    const { userId, channelId } = req.body;

    // Validate user existence
    const userResponse = await chatClient.queryUsers({ id: userId });
    if (userResponse.users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const channel = chatClient.channel("messaging", channelId, {
      name: "General Chat",
      created_by_id: userId,
    });

    await channel.create();
    res.json({ message: "Channel created successfully" });
  } catch (error) {
    console.error("Error creating channel:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// User routes
app.use("/api/users", userRoutes);

// Mongoose setup
const PORT = process.env.PORT || 9000;

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("MongoDB Connected Successfully");

    // Start the Express server
    app.listen(PORT, () => console.log(`Server is running on port: ${PORT}`));
  })
  .catch((error) => {
    console.error(`MongoDB Connection Error: ${error}`);
  });

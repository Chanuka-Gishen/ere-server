import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

import ApiResponse from "./services/ApiResponse.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors({ origin: "*" }));

// Middleware for parsing JSON request bodies
app.use(express.json());

// Helmet middleware for setting various HTTP headers for security
app.use(helmet());

// Additional helmet middleware for Cross-Origin Resource Policy
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// Morgan middleware for logging
app.use(morgan("common"));

// Your error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || "Internal Server Error";

  // Use ApiResponse class for error response
  res.status(statusCode).json(ApiResponse.error(statusCode, errorMessage));
});

// Route with success response
app.get("/", (req, res) => {
  // Use ApiResponse class for success response
  res.json(
    ApiResponse.response(200, "Success", { message: "Hello, Express!" })
  );
});

mongoose.connect(process.env.MONGODB_URL);

const db = mongoose.connection;

db.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

db.once("connected", () => {
  console.log("Connected to MongoDB");
  // Start your Express server here
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
});

/**
 * OAuth Server
 * 
 * Express server for OAuth flow and dashboard
 * Runs separately from MCP server
 */

import "dotenv/config";
import express from "express";
import oauthRoutes from "./oauth/routes.js";
import dashboardRoutes from "./oauth/dashboard.js";

const app = express();
const PORT = process.env.OAUTH_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/oauth", oauthRoutes);
app.use("/dashboard", dashboardRoutes);

// Root redirect
app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "iris-oauth" });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌈 Iris OAuth Dashboard running at:`);
  console.log(`   http://localhost:${PORT}/dashboard\n`);
  console.log(`Environment:`);
  console.log(`   CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`   CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing'}`);
  console.log(`   REDIRECT_URI: ${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback'}\n`);
});

export default app;

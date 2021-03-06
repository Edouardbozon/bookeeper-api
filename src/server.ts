/**
 * Module dependencies.
 */
import * as express from "express";
import * as compression from "compression"; // compresses requests
import * as session from "express-session";
import * as bodyParser from "body-parser";
import * as logger from "morgan";
import * as errorHandler from "errorhandler";
import * as lusca from "lusca";
import * as cors from "cors";
import * as dotenv from "dotenv";
import * as mongo from "connect-mongo";
import * as flash from "express-flash";
import * as path from "path";
import * as mongoose from "mongoose";
import * as passport from "passport";
import expressValidator = require("express-validator");

const MongoStore = mongo(session);

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env.example" });

/**
 * Controllers (route handlers).
 */
import * as userController from "./controllers/user";
import * as contactController from "./controllers/contact";
import * as sharedFlatController from "./controllers/shared-flat";
import * as joinRequestController from "./controllers/join-request";
import * as eventController from "./controllers/event";
import * as notificationController from "./controllers/notification";

/**
 * API keys and Passport configuration.
 */
import * as passportConfig from "./config/passport";

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
(<any>mongoose).Promise = Promise;

mongoose.connection.on("error", () => {
  console.log("MongoDB connection error. Please make sure MongoDB is running.");
  process.exit();
});

/**
 * Express configuration.
 */
app.set("port", process.env.PORT || 3000);
app.use(compression());
app.use(logger("dev"));
app.use(
  cors({
    origin: process.env.MOBILE_LIGHT_CLIENT_BASE_URL,
    methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 60 * 60 * 24 * 365,
    preflightContinue: true,
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
      url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
      autoReconnect: true,
    }),
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

/**
 * Primary app routes.
 */
app.post("/login", userController.postLogin);
app.post("/signup", userController.postSignup);

/**
 * API routes
 */
app.get(
  "/api/me/notifications",
  passportConfig.isAuthenticated,
  notificationController.getUserNotifications,
);
app.post(
  "/api/me/notifications/read",
  passportConfig.isAuthenticated,
  notificationController.postReadNotifications,
);

/**
 * Shared Flats
 */
app.get(
  "/api/shared-flat",
  passportConfig.isAuthenticated,
  sharedFlatController.getSharedFlat,
);
app.get(
  "/api/shared-flat/:id",
  passportConfig.isAuthenticated,
  sharedFlatController.getSharedFlatDetail,
);
app.post(
  "/api/shared-flat",
  passportConfig.isAuthenticated,
  sharedFlatController.createSharedFlat,
);
app.put(
  "/api/shared-flat",
  passportConfig.isAuthenticated,
  sharedFlatController.putSharedFlat,
);
app.delete(
  "/api/shared-flat/:id",
  passportConfig.isAuthenticated,
  sharedFlatController.deleteSharedFlat,
);

/**
 * Join requests
 */
app.get(
  "/api/shared-flat/:id/join",
  passportConfig.isAuthenticated,
  joinRequestController.getJoinSharedFlatRequest,
);
app.post(
  "/api/shared-flat/:id/join",
  passportConfig.isAuthenticated,
  joinRequestController.postJoinSharedFlatRequest,
);
app.post(
  "/api/shared-flat/:sharedFlatId/join/:joinRequestId/validate",
  passportConfig.isAuthenticated,
  joinRequestController.postValidateJoinRequest,
);
app.post(
  "/api/shared-flat/:sharedFlatId/join/:joinRequestId/reject",
  passportConfig.isAuthenticated,
  joinRequestController.postRejectJoinRequest,
);

/**
 * Events
 */
app.get(
  "/api/shared-flat/:id/event",
  passportConfig.isAuthenticated,
  eventController.getEventList,
);
app.post(
  "/api/shared-flat/:id/draft",
  passportConfig.isAuthenticated,
  eventController.postEvent,
);
app.post(
  "/api/shared-flat/:id/event/:eventId/publish",
  passportConfig.isAuthenticated,
  eventController.postPublish,
);
app.delete(
  "/api/shared-flat/:id/event/:eventId/delete",
  passportConfig.isAuthenticated,
  eventController.deleteEvent,
);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email", "public_profile"] }),
);
app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: process.env.MOBILE_LIGHT_CLIENT_BASE_URL,
  }),
  (req, res) => {
    res.redirect(process.env.MOBILE_LIGHT_CLIENT_BASE_URL);
  },
);

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
  console.log(
    "  App is running at http://localhost:%d in %s mode",
    app.get("port"),
    app.get("env"),
  );
  console.log("  Press CTRL-C to stop\n");
});

module.exports = app;

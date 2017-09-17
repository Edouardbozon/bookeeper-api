/**
 * Module dependencies.
 */
import * as express from "express";
import * as compression from "compression";  // compresses requests
import * as session from "express-session";
import * as bodyParser from "body-parser";
import * as logger from "morgan";
import * as errorHandler from "errorhandler";
import * as lusca from "lusca";
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
import * as apiController from "./controllers/facebook";
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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
        url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
        autoReconnect: true
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== "/login" &&
        req.path !== "/signup" &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user &&
        req.path == "/account") {
        req.session.returnTo = req.path;
    }
    next();
});

/**
 * Primary app routes.
 */
// app.get("/login", userController.getLogin);
app.post("/login", userController.postLogin);
// app.get("/logout", userController.logout);
// app.get("/forgot", userController.getForgot);
// app.post("/forgot", userController.postForgot);
// app.get("/reset/:token", userController.getReset);
// app.post("/reset/:token", userController.postReset);
app.post("/signup", userController.postSignup);
// app.post("/contact", contactController.postContact);
// app.post("/account/profile", passportConfig.isAuthenticated, userController.postUpdateProfile);
// app.post("/account/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
// app.post("/account/delete", passportConfig.isAuthenticated, userController.postDeleteAccount);
// app.get("/account/unlink/:provider", passportConfig.isAuthenticated, userController.getOauthUnlink);

/**
 * API routes
 */
// app.get("/api/facebook", passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);
app.get("/api/me/notifications", passportConfig.isAuthenticated, notificationController.getUserNotifications);

/**
 * Shared Flats
 */
app.get("/api/shared-flat", passportConfig.isAuthenticated, sharedFlatController.getSharedFlat);
app.post("/api/shared-flat", passportConfig.isAuthenticated, sharedFlatController.createSharedFlat);
app.delete("/api/shared-flat/:id", passportConfig.isAuthenticated, sharedFlatController.deleteSharedFlat);

/**
 * Join requests
 */
app.get(
    "/api/shared-flat/:id/join-request",
    passportConfig.isAuthenticated,
    joinRequestController.getJoinSharedFlatRequest
);
app.post(
    "/api/shared-flat/:id/join-request",
    passportConfig.isAuthenticated,
    joinRequestController.postJoinSharedFlatRequest
);
app.post(
    "/api/shared-flat/:sharedFlatId/join-request/:joinRequestId/validate",
    passportConfig.isAuthenticated,
    joinRequestController.postValidateJoinRequest
);
app.post(
    "/api/shared-flat/:sharedFlatId/join-request/:joinRequestId/reject",
    passportConfig.isAuthenticated,
    joinRequestController.postRejectJoinRequest
);

/**
 * Events
 */
app.get(
    "/api/shared-flat/:id/event",
    passportConfig.isAuthenticated,
    eventController.getEventList
);
app.post(
    "/api/shared-flat/:id/event",
    passportConfig.isAuthenticated,
    eventController.postEvent
);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile"] }));
app.get("/auth/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/login" }), (req, res) => {
    res.status(200).end();
});


/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
    console.log(("  App is running at http://localhost:%d in %s mode"), app.get("port"), app.get("env"));
    console.log("  Press CTRL-C to stop\n");
});

module.exports = app;

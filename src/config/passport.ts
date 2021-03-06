import * as passport from "passport";
import * as passportLocal from "passport-local";
import * as passportHttp from "passport-http";
import * as passportFacebook from "passport-facebook";
import * as _ from "lodash";

import { default as User, UserModel } from "../models/User/User";
import { Request, Response, NextFunction } from "express";

const LocalStrategy = passportLocal.Strategy;
const BasicStrategy = passportHttp.BasicStrategy;
const FacebookStrategy = passportFacebook.Strategy;

passport.serializeUser((user: UserModel, done) => {
    done(undefined, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user: UserModel) => {
        done(err, user);
    });
});


/**
 * Local Auth
 */
passport.use(new LocalStrategy({ usernameField: "email" }, (email: string, password: string, done: Function) => {
    User.findOne({ email: email.toLowerCase() }, (err, user: UserModel) => {
        if (err) return done(err);
        if (!user) return done(undefined, false, { message: `Email ${email} not found.` });

        user.comparePassword(password, (err: Error, isMatch: boolean) => {
            if (err) return done(err);
            if (isMatch) return done(undefined, user);

            return done(undefined, false, { message: "Invalid email or password." });
        });
    });
}));

/**
 * Basic Auth
 */
passport.use(new BasicStrategy(
    (username: string, password: string, done: Function) => {
        User.findOne({ "profile.name": username }, (err, user: UserModel) => {
            if (err) return done(err);
            if (!user) return done(undefined, false);

            user.comparePassword(password, (err: Error, isMatch: boolean) => {
                if (err) return done(err);
                if (isMatch) return done(undefined, user);

                return done(undefined, false, { message: "Invalid email or password." });
            });
        });
    }
));

/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */


/**
 * Sign in with Facebook.
 */
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    profileFields: ["name", "email", "link", "locale", "timezone"],
    passReqToCallback: true
}, (req: any, accessToken, refreshToken, profile, done: Function) => {
    if (req.user) {
        User.findOne({ facebook: profile.id }, (err, existingUser: UserModel) => {
            if (err) { return done(err); }
            if (existingUser) {
                return done("There is already a Facebook account that belongs to you. Sign in with that account" +
                    " or delete it, then link it with your current account.");
            }

            User.findById(req.user.id, (err, user: UserModel) => {
                if (err) { return done(err); }
                user.facebook = profile.id;
                user.tokens.push({ kind: "facebook", accessToken });

                // @todo update profile in a better way
                user.profile.name = user.profile.name || `${profile.name.givenName} ${profile.name.familyName}`;
                user.profile.gender = user.profile.gender || profile._json.gender;
                user.profile.picture = user.profile.picture || `https://graph.facebook.com/${profile.id}/picture?type=large`;

                user.save((err: Error) => {
                    req.flash("info", { msg: "Facebook account has been linked." });
                    done(err, user);
                });
            });
        });
    } else {
        User.findOne({ facebook: profile.id }, (err, existingUser: UserModel) => {
            if (err) { return done(err); }
            if (existingUser) {
                return done(undefined, existingUser);
            }

            User.findOne({ email: profile._json.email }, (err, existingEmailUser: UserModel) => {
                if (err) { return done(err); }
                if (existingEmailUser) {
                    return done("There is already an account using this email address. Sign in to that account and" +
                        " link it with Facebook manually from Account Settings.");
                }

                const user = new User() as UserModel;
                user.email = profile._json.email;
                user.facebook = profile.id;
                user.tokens.push({ kind: "facebook", accessToken });

                // @todo update profile in a better way
                user.profile.name = `${profile.name.givenName} ${profile.name.familyName}`;
                user.profile.gender = profile._json.gender;
                user.profile.picture = `https://graph.facebook.com/${profile.id}/picture?type=large`;
                user.profile.location = (profile._json.location) ? profile._json.location.name : "";

                user.save((err: Error) => {
                    done(err, user);
                });
            });
        });
    }
}));

/**
 * Login Required middleware.
 */
export let isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.sendStatus(403);
};

/**
 * Authorization Required middleware.
 */
export let isAuthorized = (req: Request, res: Response, next: NextFunction) => {
    const provider = req.path.split("/").slice(-1)[0];

    if (_.find(req.user.tokens, { kind: provider })) {
        next();
    } else {
        res.redirect(`/auth/${provider}`);
    }
};

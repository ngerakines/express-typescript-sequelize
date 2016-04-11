/**
 * Created by ngerakines on 4/11/16.
 */

import * as express from "express";
import methodOverride = require("method-override");
import bodyParser = require("body-parser");
import * as Promise from "bluebird";
import {Logger, createLogger} from "bunyan";
import * as session from "express-session";
import * as cookieParser from "cookie-parser";
var flash = require('connect-flash');
import * as cons from "consolidate";
import {compareSync} from "bcryptjs";

import * as passport from "passport";
import {Strategy as LocalStrategy} from "passport-local";

import {StorageManager, SequelizeStorageManager} from "./storage";
import {ApplicationController} from "./routes";

function loggedIn(req:express.Request, res:express.Response, next:express.NextFunction) {
    if (req.user) {
        next();
    } else {
        res.redirect("/");
    }
}

export function configureExpress(logger:Logger, storageManager:StorageManager):Promise<any> {
    return Promise
        .resolve(express())
        .then((app) => {
            app.set('view options', {pretty: false});
            app.set("etag", false);
            app.disable("x-powered-by");

            app.engine("dust", cons.dust);

            app.set("views", __dirname + "/../views");
            app.set("view engine", "dust");

            app.use(express.static(__dirname + "/../public"));

            passport.use(new LocalStrategy(
                function(username, password, done) {
                    storageManager.getAccountByEmail(username)
                        .then((account:any) => {
                            if (account === null) {
                                return done(null, false, { message: 'Incorrect account.' });
                            }
                            if (compareSync(password, account.password)) {
                                return done(null, account);
                            }
                            return done(null, false, { message: 'Incorrect password.' });
                        })
                        .catch((err:any) => {
                            console.log(err);
                            return done(null, false, { message: 'Internal error.' });
                        });
                }
            ));

            passport.serializeUser(function(account, done) {
                done(null, account.id);
            });

            passport.deserializeUser(function(id, done) {
                storageManager.getAccountById(id)
                    .then((account:any) => {
                        if (account !== undefined) {
                            return done(null, account);
                        }
                        return done(new Error("Invalid account"), null)
                    })
                    .catch((err:any) => {
                        done(err, null);
                    });
            });

            app.use(methodOverride());
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({extended: false}));

            app.use(cookieParser());
            app.use(session({ secret: 'keyboard cat' }));
            app.use(passport.initialize());
            app.use(passport.session());

            app.use(flash());

            app.use((req:express.Request, res:express.Response, next:express.NextFunction) => {
                logger.info({method: req.method, url: req.url, protocol: req.protocol, ip: req.ip, hostname: req.hostname}, req.method + " " + req.path);
                next();
            });

            return app;
        });
}

export function congifureRoutes(app:express.Application, logger:Logger, storageManager:StorageManager):Promise<any> {
    return new Promise((resolve) => {
        let applicationController = new ApplicationController(logger, storageManager);
        app.get("/", applicationController.home);
        app.post("/register", applicationController.completeRegistration);
        app.post("/login",
            passport.authenticate("local", { successRedirect: "/settings",
                failureRedirect: "/",
                failureFlash: true })
        );
        app.get('/logout', function(req, res){
            req.logout();
            res.redirect("/");
        });
        app.get("/settings", loggedIn, applicationController.settings);
        app.post("/settings/address", loggedIn, applicationController.addAddress);

        resolve();
    });
}

export function start(logger?:Logger):Promise<any> {
    logger = logger || createLogger({
            name: "express-typescript-sequelize",
            stream: process.stdout,
            level: "info"
        });
    let storageManager = new SequelizeStorageManager({database: "example", username: process.env.EXAMPLE_USERNAME || "username", password: ""}, logger);

    return storageManager.init()
        .then(() => {
            return configureExpress(logger, storageManager)
                .then((app:express.Application) => {
                    return congifureRoutes(app, logger, storageManager)
                        .then(() => {
                            return app;
                        });
                })
                .then((app:express.Application) => {
                    return new Promise((resolve) => {
                        var server = app.listen(3000, () => {
                            resolve(server);
                        });
                    });
                })
        });
}

/**
 * Created by ngerakines on 4/11/16.
 */

import {Logger} from "bunyan";
import * as express from "express";
import {StorageManager} from "./storage";

export abstract class BaseController {
    protected logger:Logger;

    constructor(logger:Logger) {
        this.logger = logger;
    }

}

interface HomeView {
    messages?:any[];
    errors?:any[];
    account?:any;
}

interface SettingsView {
    messages?:any[];
    errors?:any[];
    account?:any;
    addresses:any[];
}

export class ApplicationController extends BaseController {

    private storageManager:StorageManager;

    constructor(logger:Logger, storageManager:StorageManager) {
        super(logger.child({component: "ApplicationController"}));
        this.storageManager = storageManager;
    }

    home = (req:express.Request, res:express.Response) => {
        let view:HomeView = {
            messages: req.flash("message"),
            errors: req.flash("error")
        };
        if (req.user !== undefined) {
            view.account = req.user;
        }
        res.render("index", view);
    };

    register = (req:express.Request, res:express.Response) => {
        res.render("register");
    };

    completeRegistration = (req:express.Request, res:express.Response) => {
        this.storageManager
            .register(req.body.name, req.body.email, req.body.password)
            .then((account) => {
                req.login(account, function(err) {
                    if (err) {
                        throw new Error(err.toString());
                    }
                    req.flash("message", "Welcome, " + account.name + "!");
                    return res.redirect("/settings");
                });
            })
            .catch((err:any) => {
                req.flash("error", "Error creating account.");
                return res.redirect("/");
            })

    };

    settings = (req:express.Request, res:express.Response) => {
        req.user.getAddresses()
        .then((addresses:any[]) => {
            let view:SettingsView = {
                messages: req.flash("message"),
                errors: req.flash("error"),
                account: req.user,
                addresses: addresses
            };
            res.render("settings", view);
        })
    };

    addAddress = (req:express.Request, res:express.Response) => {
        this.storageManager
            .addAddress(req.user, req.body.street, req.body.city, req.body.state, req.body.zip)
            .then((account) => {
                req.flash("message", "Created address!");
                return res.redirect("/settings");
            })
            .catch((err:any) => {
                req.flash("error", "Error creating address.");
                return res.redirect("/settings");
            })
    };
}

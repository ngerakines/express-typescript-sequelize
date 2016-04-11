/**
 * Created by ngerakines on 4/11/16.
 */

import chai = require("chai");
var expect = chai.expect;

import {Logger, createLogger} from "bunyan";
import {SequelizeStorageManager} from "./storage";

//import {Mock, It, Times} from "typemoq";

var logger:Logger = createLogger({
    name: "express-typescript-sequelize",
    stream: process.stderr,
    level: process.env.LOG_LEVEL || "fatal"
});

describe("Storage", () => {

    describe("Accounts", () => {
        it("can be created", (done) => {
            let storage = new SequelizeStorageManager({database: "example-test", username: "username", password: ""}, logger);
            storage.init(true)
                .then(() => {
                    return storage.register("Nick Gerakines", "nick@gerakines.net", "password");
                })
                .then((account) => {
                    expect(account).to.have.property("name", "Nick Gerakines");
                    expect(account).to.have.property("email", "nick@gerakines.net");
                    expect(account).to.have.property("password");
                })
                .then(() => done())
                .catch((err) => done(err));
        });
    });
});

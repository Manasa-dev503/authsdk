import express from 'express';
import * as bodyParser from "body-parser";
import mongoose from 'mongoose';
import SplitAuth from '@splitbitio/authy-sdk';


async function main() {
    const connectionString =
        "mongodb://127.0.0.1:27017";
    const dbInstance: mongoose.Connection = await new Promise(
        (resolve, reject) => {
            const db = mongoose.createConnection(connectionString, {
                dbName: "auth-sdk",
            });

            db.on("error", function (error) {
                console.log(`MongoDB :: connection  ${JSON.stringify(error)}`);
                db.close().catch(() =>
                    console.log(`MongoDB :: failed to close connection`)
                );
                reject(error);
            });

            db.on("connected", function () {
                mongoose.set("debug", function (col, method, query, doc) {
                    console.log(
                        `MongoDB :: ${col}.${method}(${JSON.stringify(
                            query
                        )},${JSON.stringify(doc)})`
                    );
                });
                console.log(`MongoDB :: connected`);
                resolve(db);
            });

            db.on("disconnected", function () {
                console.log(`MongoDB :: disconnected`);
                reject("disconnected");
            });
        }
    );
    const app = express();
    const port = process.env.PORT || 8080;
    const splitAuth = new SplitAuth({
        dbInstance: dbInstance,
        secretString: "4c546dcc99cfef22ac8a26ae1a7a09de",
        emailVerification: false,
        collection: "users",
        gmailCredentials: {
            clientId:
                "970867642182-n9t51fivf5b05om5m1tdmnch606lf6ce.apps.googleusercontent.com",
            clientSecret: "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",
            refreshToken:
                "1//04R7pwUUAfsVTCgYIARAAGAQSNwF-L9IrB6s3uKheWqjvjnjcflJYeJtwHTggTsGk3QO0kaBruBh9fYGrbwWEpq5MLJJDWtgBgx4",
        },
    });
    app.use(bodyParser.json());
    app.use(express.json());

    app.post("/signup", async (req, res) => {
        const response = await splitAuth.signup(req.body);
        res.send(response);
    });
    app.post("/login", async (req, res) => {
        const response = await splitAuth.login(req.body);
        res.send(response);
    });

 app.post("/forgot-password", async (req, res) => {
        const response = await splitAuth.forgotPassword(req.body);
        res.send(response);
    });

    app.post("/reset-password", async (req, res) => {
        const response = await splitAuth.resetPassword(req.body);
        res.send(response);
    });

    app.get(
        "/data",
        [(req, res, next) => splitAuth.authenticate(req, res, next)],
        async (req, res) => {
            res.send("ok");
        }
    );

    app.listen(port, function () {
        console.log("Listening to port", port);
    });
}

main();
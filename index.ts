import express from 'express';
import * as bodyParser from "body-parser";
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import SplitAuth from '@splitbitio/authy-sdk';
import UserModel from './models/UserModel';


dotenv.config();

async function main() {
    const connectionString = process.env.DB_CONNECTION_STRING || "mongodb+srv://admin:cdkpiLdQgBLwnnc7@cluster0.biojw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    const dbName = process.env.DB_NAME || "auth-sdk";
    const secretString = process.env.SECRET_STRING || "defaultSecret";

    const dbInstance: mongoose.Connection = await new Promise(
        (resolve, reject) => {
            const db = mongoose.createConnection(connectionString, {
                dbName: dbName,
                serverSelectionTimeoutMS:10000
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
        secretString: secretString,
        emailVerification: false,
        collection: "users",
        gmailCredentials: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
        },
    });

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: 'http://localhost:8080/auth/googleauth'
    },
    async (accessToken, refreshToken, profile, done) => {
      //  console.log(profile)
        try {
           // console.log("model",UserModel.findOne({googleId: profile.id}).exec())
           const user = UserModel.findOne({ email: profile.emails[0].value }).exec()
           console.log("user found::",user)
            if (!user) {
                const newUser = new UserModel({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value
                });
                 newUser.save();
                return done(null, newUser);
            }
            return done(null, user);
        } catch (err) {
            console.error(err);
            return done(err);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });

    app.use(session({
        secret: secretString,
        resave: false,
        saveUninitialized: true
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(bodyParser.json());
    app.use(express.json());

    app.get("/auth/google",
        passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get("/auth/googleauth",
        passport.authenticate("google", { failureRedirect: "/login" }),
        (req, res) => {
            res.redirect("/profile");
        }
    );

    app.get("/profile",function(req,res){
        res.send("Welcome to dashboard")
    })
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

    app.get("/data",
        (req, res, next) => splitAuth.authenticate(req, res, next),
        async (req, res) => {
            res.send("ok");
        }
    );

    app.listen(port, function () {
        console.log("Listening to port", port);
    });
}

main();

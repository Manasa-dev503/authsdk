import express from 'express';
import * as bodyParser from "body-parser";
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
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
        secretString: "ddr66ghdgseert34546",
        emailVerification: false,
        collection: "users",
        gmailCredentials: {
            clientId:
                "874739149153-g4nv5hn51i8ol3md3lcrokmctlt46872.apps.googleusercontent.com",
            clientSecret: "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",
            refreshToken:
                "1//04R7pwUUAfsVTCgYIARAAGAQSNwF-L9IrB6s3uKheWqjvjnjcflJYeJtwHTggTsGk3QO0kaBruBh9fYGrbwWEpq5MLJJDWtgBgx4",
        },
    });

    passport.use(new GoogleStrategy({
        clientID : splitAuth.gmailCredentials.clientId,
        clientSecret : splitAuth.gmailCredentials.clientSecret,
        callbackURL : 'http://localhost:8080/auth/google/callback'
    },
    async (accessToken,refreshToken,profile,done) => {
        console.log(profile)
        try {
            const user = await splitAuth.googleSignInOrSignup(profile);
            return done(null, user);
        } catch (error){
            return done(error)
        }
    }))
    passport.serializeUser((user,done)=>{
        done(null,user)
    })
    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });
   
    app.use(session({
        secret: 'fghj',
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

    app.get("/auth/google/callback",
        passport.authenticate("google", { failureRedirect: "/login" }),
        (req, res) => {
            res.redirect("/profile");
        }
    );

    app.get('/profile',function(req,res){
        res.send('hi')
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
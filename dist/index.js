"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bodyParser = __importStar(require("body-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const dotenv_1 = __importDefault(require("dotenv"));
const authy_sdk_1 = __importDefault(require("@splitbitio/authy-sdk"));
const UserModel_1 = __importDefault(require("./models/UserModel"));
dotenv_1.default.config();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const connectionString = process.env.DB_CONNECTION_STRING || "mongodb+srv://admin:cdkpiLdQgBLwnnc7@cluster0.biojw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
        const dbName = process.env.DB_NAME || "auth-sdk";
        const secretString = process.env.SECRET_STRING || "defaultSecret";
        const dbInstance = yield new Promise((resolve, reject) => {
            const db = mongoose_1.default.createConnection(connectionString, {
                dbName: dbName,
                serverSelectionTimeoutMS: 10000
            });
            db.on("error", function (error) {
                console.log(`MongoDB :: connection  ${JSON.stringify(error)}`);
                db.close().catch(() => console.log(`MongoDB :: failed to close connection`));
                reject(error);
            });
            db.on("connected", function () {
                mongoose_1.default.set("debug", function (col, method, query, doc) {
                    console.log(`MongoDB :: ${col}.${method}(${JSON.stringify(query)},${JSON.stringify(doc)})`);
                });
                console.log(`MongoDB :: connected`);
                resolve(db);
            });
            db.on("disconnected", function () {
                console.log(`MongoDB :: disconnected`);
                reject("disconnected");
            });
        });
        const app = (0, express_1.default)();
        const port = process.env.PORT || 8080;
        const splitAuth = new authy_sdk_1.default({
            dbInstance: dbInstance,
            secretString: secretString,
            emailVerification: false,
            collection: "users",
            gmailCredentials: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
            },
        });
        passport_1.default.use(new passport_google_oauth20_1.Strategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: 'http://localhost:8080/auth/googleauth'
        }, (accessToken, refreshToken, profile, done) => __awaiter(this, void 0, void 0, function* () {
            //  console.log(profile)
            try {
                // console.log("model",UserModel.findOne({googleId: profile.id}).exec())
                const user = UserModel_1.default.findOne({ email: profile.emails[0].value }).exec();
                console.log("user found::", user);
                if (!user) {
                    const newUser = new UserModel_1.default({
                        googleId: profile.id,
                        name: profile.displayName,
                        email: profile.emails[0].value
                    });
                    newUser.save();
                    return done(null, newUser);
                }
                return done(null, user);
            }
            catch (err) {
                console.error(err);
                return done(err);
            }
        })));
        passport_1.default.serializeUser((user, done) => {
            done(null, user);
        });
        passport_1.default.deserializeUser((obj, done) => {
            done(null, obj);
        });
        app.use((0, express_session_1.default)({
            secret: secretString,
            resave: false,
            saveUninitialized: true
        }));
        app.use(passport_1.default.initialize());
        app.use(passport_1.default.session());
        app.use(bodyParser.json());
        app.use(express_1.default.json());
        app.get("/auth/google", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
        app.get("/auth/googleauth", passport_1.default.authenticate("google", { failureRedirect: "/login" }), (req, res) => {
            res.redirect("/profile");
        });
        app.get("/profile", function (req, res) {
            res.send("Welcome to dashboard");
        });
        app.post("/signup", (req, res) => __awaiter(this, void 0, void 0, function* () {
            const response = yield splitAuth.signup(req.body);
            res.send(response);
        }));
        app.post("/login", (req, res) => __awaiter(this, void 0, void 0, function* () {
            const response = yield splitAuth.login(req.body);
            res.send(response);
        }));
        app.post("/forgot-password", (req, res) => __awaiter(this, void 0, void 0, function* () {
            const response = yield splitAuth.forgotPassword(req.body);
            res.send(response);
        }));
        app.post("/reset-password", (req, res) => __awaiter(this, void 0, void 0, function* () {
            const response = yield splitAuth.resetPassword(req.body);
            res.send(response);
        }));
        app.get("/data", (req, res, next) => splitAuth.authenticate(req, res, next), (req, res) => __awaiter(this, void 0, void 0, function* () {
            res.send("ok");
        }));
        app.listen(port, function () {
            console.log("Listening to port", port);
        });
    });
}
main();

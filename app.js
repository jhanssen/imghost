/*global module,require,process,Buffer,__dirname*/

const express = require("express");
const multer = require("multer");
const path = require("path");
const passport = require("passport");

const data = {
    mongoose: undefined,
    gridfs: undefined,
    User: undefined,
    Image: undefined,
    updateOptions: { upsert: true, new: true, setDefaultsOnInsert: true }
};

passport.serializeUser(function(user, done) {
    console.log("serializing", user);
    let email;
    try {
        email = user.emails[0].value;
    } catch (e) {
        done(e, null);
    }
    if (email) {
        console.log("serialized", email);
        data.User.findOneAndUpdate({ email: email }, { displayName: user.displayName }, data.updateOptions).then(() => {
            done(null, email);
        }).catch(err => {
            done(err, null);
        });
    }
});

passport.deserializeUser(function(id, done) {
    console.log("deserializing", id);
    done(null, { email: id });
    /*
    data.User.findOne({ email: id }).then(data => {
        console.log("deserialized", data);
        done(null, data);
    }).catch(err => {
        done(err, null);
    });
    */
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next(null);
    } else {
        res.redirect('/auth');
    }
}

module.exports = function(mongoose, option) {
    data.mongoose = mongoose;

    // buggy grid_store?
    if (!mongoose.connection.options)
        mongoose.connection.options = {};

    data.gridfs = require("mongoose-gridfs")({
        collection: "fs",
        model: "Image",
        mongooseConnection: mongoose.connection
    });
    data.Image = data.gridfs.model;
    data.User = mongoose.model("User", {
        email: String,
        displayName: String,
        images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Image" }]
    });

    const connection = mongoose.connection;
    const sessionSecret = option("session-secret");
    if (!sessionSecret) {
        console.error("Need a session secret");
        process.exit(1);
    }

    const multerStorage = require("multer-gridfs-storage")({
        db: connection.db
    });
    const upload = multer({ storage: multerStorage });

    const auths = ["google"];
    const enabledAuths = [];
    auths.forEach(auth => {
        if (require(`./auth/${auth}`)(passport, connection, option))
            enabledAuths.push(auth);
    });

    const app = express();
    app.use("/files", express.static(path.join(__dirname + "/files")));
    app.use(require('express-session')({ secret: sessionSecret, resave: true, saveUninitialized: true }));
    app.use(passport.initialize());
    app.use(passport.session());

    app.get("/", ensureAuthenticated, (req, res) => {
        res.send("Hello world");
    });

    app.get("/auth", (req, res) => {
        let out = "";
        enabledAuths.forEach(auth => {
            out += `<div><a href="/auth/${auth}">${auth}</a></div>`;
        });
        res.send(out);
    });

    if (enabledAuths.indexOf("google") !== -1) {
        console.log("Setting up Google auth routes");
        app.get("/auth/google", passport.authenticate("google", { scope: ["profile","email"] }));
        app.get('/auth/google/callback',
                passport.authenticate('google', { failureRedirect: '/auth' }),
                function(req, res) {
                    // Successful authentication, redirect home.
                    res.redirect('/');
                });
    }

    app.get("/images/upload", ensureAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname + "/files/upload.html"));
    });
    app.post("/images/upload", ensureAuthenticated, upload.array("photos", 12), (req, res) => {
        const images = req.files.map(file => {
            return file.id;
        });
        const remove = (msg) => {
            data.Image.remove({ _id: { $in: images } }).then(() => {
                res.sendStatus(500);
            }).catch(err => {
                // something went horribly wrong
                console.error(msg, err);
                res.sendStatus(500);
            });
        };
        data.User.findOne({ email: req.user.email }).then(user => {
            if (!user)
                throw `Unable to find user ${req.user.email}`;
            console.log("found user", user);
            //console.log("images", images);
            data.User.findOneAndUpdate({ email: user.email }, { $push: { images: { $each: images } } }).then(doc => {
                if (!doc)
                    throw `Unable to find user ${user.email} (2)`;
                res.send("ok");
            }).catch(err => {
                // also bad, remove images
                console.error("unable to update user", err);
                remove("unable to remove images (2)");
            });
        }).catch(err => {
            // this is bad, remove images
            console.error("unable to find user", err);
            remove("unable to remove images (1)");
        });
    });
    app.get("/images", ensureAuthenticated, (req, res) => {
        data.User.findOne({ email: req.user.email }, { images: true }).then(images => {
            if (typeof images !== "object" || !(images.images instanceof Array))
                throw `Unable to find user ${req.user.email}`;
            let out = "";
            for (let i = 0; i < images.images.length; ++i) {
                out += `<div><img src="/image/${images.images[i]}"></img></div>`;
            }
            console.log("faff", out);
            res.send(out);
        }).catch(err => {
            console.error(`unable to get images for ${req.user.email}`);
            res.sendStatus(500);
        });
    });
    app.get("/image/:id", (req, res) => {
        //data.Image.findOne({ _id: req.params.id }
        const id = new mongoose.Types.ObjectId(req.params.id);
        console.log(id);
        // ugh
        data.gridfs.storage.findOne({ _id: id }, (err, file) => {
            if (err) {
                console.error("nope");
                res.sendStatus(500);
                return;
            }
            // console.log(file);
            res.setHeader("content-type", file.contentType);
            res.setHeader("content-length", file.length);
            const stream = data.gridfs.readById(id);
            stream.on("error", err => {
                console.error(err);
                res.end();
            });
            stream.on("data", data => {
                res.write(data);
                //console.log(typeof data, data instanceof Buffer);
            });
            stream.on("close", () => {
                console.log("done");
                res.end();
            });
        });
    });

    const port = option.int("port", 3001);
    app.listen(port, () => {
        console.log(`Listening on ${port}`);
    });
};

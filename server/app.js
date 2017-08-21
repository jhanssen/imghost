/*global module,require,process,Buffer,__dirname*/

const express = require("express");
const multer = require("multer");
const path = require("path");
const passport = require("passport");
const sharp = require("sharp");

const data = {
    mongoose: undefined,
    gridfs: undefined,
    User: undefined,
    Image: undefined,
    ResizedImage: {},
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

function makeObjectID(id) {
    if (id instanceof data.mongoose.Types.ObjectId)
        return id;
    try {
        return new data.mongoose.Types.ObjectId(id);
    } catch (err) {
        return undefined;
    }
}

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next(null);
    } else {
        res.sendStatus(401);
    }
}

function resize(id, width)
{
    return new Promise((resolve, reject) => {
        if (!(width in data.ResizedImage)) {
            reject(new Error(`${width} not a valid resize`));
            return;
        }
        const ResizedImage = data.ResizedImage[width];

        ResizedImage.gridfs.findOne({ root: ResizedImage.collection, _id: id }, (err, file) => {
            console.log("found already?", err, file);
            if (err) {
                reject(err);
                return;
            }

            if (file) {
                resolve({ file: file, stream: ResizedImage.gridfs.readById(id) });
            } else {
                data.gridfs.findOne({ _id: id }, (err, file) => {
                    console.log("found original?", err, file);
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (!file) {
                        reject(new Error("No such file"));
                        return;
                    }
                    console.log("creating resize object for", width, ResizedImage.height);
                    const readable = data.gridfs.readById(id);//.pipe(resize);
                    let buffers = [];
                    let rejected = false;

                    // sharps stream handling really sucks,
                    // make one buffer out of the stream for now
                    readable.on("error", err => {
                        rejected = true;
                        reject(err);
                    });
                    readable.on("data", data => {
                        buffers.push(data);
                    });
                    readable.on("close", () => {
                        if (rejected)
                            return;
                        if (!buffers.length) {
                            reject(new Error("no buffer"));
                            return;
                        }
                        console.log("readable close");
                        const sharpable = sharp(Buffer.concat(buffers)).resize(width, ResizedImage.height).max();
                        console.log("writing...");
                        const writable = ResizedImage.gridfs.write({
                            _id: file._id,
                            filename: file.filename,
                            contentType: file.contentType
                        }, sharpable);
                        writable.on("error", err => {
                            console.log("error", err);
                            rejected = true;
                            reject(err);
                        });
                        writable.on("close", file => {
                            if (rejected)
                                return;
                            console.log("saved", file);
                            if (file) {
                                resolve({ file: file, stream: ResizedImage.gridfs.readById(id) });
                            } else {
                                reject(new Error("Unable to store resized image?"));
                            }
                        });
                    });
                });
            }
        });
    });
}

module.exports = function(mongoose, option) {
    data.mongoose = mongoose;

    // buggy grid_store?
    if (!mongoose.connection.options)
        mongoose.connection.options = {};

    data.gridfs = require("mongoose-gridfs")({
        collection: "fs",
        model: "Image",
        mongooseConnection: mongoose.connection.db
    });
    data.Image = data.gridfs.model;

    [320, 480, 640, 960].forEach(maxw => {
        const resized = {};
        resized.height = maxw * 0.75;
        resized.collection = `resize${maxw}`;
        resized.gridfs = require("mongoose-gridfs")({
            collection: resized.collection,
            model: `Image${maxw}`,
            mongooseConnection: mongoose.connection.db
        });
        resized.model = resized.gridfs.model;
        data.ResizedImage[maxw] = resized;
    });

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
    app.use(require('express-session')({ secret: sessionSecret, resave: true, saveUninitialized: true }));
    app.use(passport.initialize());
    app.use(passport.session());

    const router = express.Router();
    router.get("/", (req, res) => {
        res.redirect("/images");
    });

    router.get("/auth", (req, res) => {
        // let out = {};
        // enabledAuths.forEach(auth => {
        //     out += `<div><a href="/auth/${auth}">${auth}</a></div>`;
        // });
        res.send(enabledAuths);
    });

    if (enabledAuths.indexOf("google") !== -1) {
        console.log("Setting up Google auth routes");
        router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
        router.get('/auth/google/callback',
                passport.authenticate('google', { failureRedirect: '/auth' }),
                function(req, res) {
                    // Successful authentication, redirect home.
                    res.redirect('/');
                });
    }

    router.post("/images/upload", ensureAuthenticated, upload.array("photos", 12), (req, res) => {
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
                res.send({ ok: true });
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
    router.get("/images", ensureAuthenticated, (req, res) => {
        data.User.findOne({ email: req.user.email }, { images: true }).then(images => {
            if (typeof images !== "object" || !(images.images instanceof Array))
                throw `Unable to find user ${req.user.email}`;
            // let out = [];
            // for (let i = 0; i < images.images.length; ++i) {
            //     out += `<div><a href="/image/${images.images[i]}"><img src="/image/${images.images[i]}" height="100"></img></a></div>`;
            // }
            // console.log("faff", out);
            res.send(images.images);
        }).catch(err => {
            console.error(`unable to get images for ${req.user.email}`);
            res.sendStatus(500);
        });
    });
    router.get("/image/:id", (req, res) => {
        //data.Image.findOne({ _id: req.params.id }
        const id = makeObjectID(req.params.id);
        if (!id) {
            res.sendStatus(500);
            return;
        }
        console.log(id);
        data.gridfs.findOne({ _id: id }, (err, file) => {
            if (err || !file) {
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
    router.get("/resized/:width/:id", (req, res) => {
        const width = parseInt(req.params.width);
        if (!(width in data.ResizedImage)) {
            res.sendStatus(404);
            return;
        }
        const id = makeObjectID(req.params.id);
        if (!id) {
            res.sendStatus(500);
            return;
        }
        resize(id, width).then(data => {
            res.setHeader("content-type", data.file.contentType);
            res.setHeader("content-length", data.file.length);
            data.stream.on("error", err => {
                console.error(err);
                res.end();
            });
            data.stream.on("data", data => {
                res.write(data);
                //console.log(typeof data, data instanceof Buffer);
            });
            data.stream.on("close", () => {
                console.log("done");
                res.end();
            });
        }).catch(err => {
            console.error("exception?", err);
            res.sendStatus(500);
        });
    });
    router.get("/delete/:id", ensureAuthenticated, (req, res) => {
        const id = makeObjectID(req.params.id);
        if (!id) {
            res.sendStatus(500);
            return;
        }
        console.log("deleting", id);
        // remove from user
        data.User.findOneAndUpdate({ email: req.user.email }, { $pull: { images: id } }).then(doc => {
            // verify that doc did contain the id, otherwise the user might be trying to do evil things
            if (doc && doc.images instanceof Array && doc.images.indexOf(id) !== -1) {
                // get all available gridfs
                let gridfses = [data.gridfs];
                for (let k in data.ResizedImage) {
                    gridfses.push(data.ResizedImage[k].gridfs);
                }
                let offset = 0;
                let next = () => {
                    if (offset >= gridfses.length) {
                        res.send({ ok: true });
                        return;
                    }
                    const gridfs = gridfses[offset++];
                    gridfs.unlinkById(id, (err, ok) => {
                        if (err) {
                            console.error("failed to unlink", err);
                            res.sendStatus(500);
                        } else {
                            process.nextTick(next);
                        }
                    });
                };
                next();
            } else {
                console.error(`user ${req.user.email} tried to remove id ${id}`);
                res.sendStatus(500);
            }
        }).catch(err => {
            console.error("error removing from images", id);
            res.sendStatus(500);
        });
    });

    app.use("/api/v1", router);

    const port = option.int("port", 3001);
    app.listen(port, () => {
        console.log(`Listening on ${port}`);
    });
};

/*global module,require,process,Buffer,__dirname*/

const express = require("express");
const multer = require("multer");
const path = require("path");
const passport = require("passport");
const sharp = require("sharp");
const crypto = require("crypto");

const data = {
    mongoose: undefined,
    host: undefined,
    gridfs: undefined,
    User: undefined,
    Image: undefined,
    ResizedImage: {},
    resizes: [],
    userPromises: {}
};

function generateId() {
    const alpha = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
    return new Promise((resolve, reject) => {
        crypto.randomBytes(20, (err, buf) => {
            if (err || !buf) {
                reject(err);
            } else {
                let out = "";
                for (let i = 0; i < buf.length; ++i) {
                    out += alpha[buf[i] % 0x40];
                }
                resolve(out);
            }
        });
    });
}

function ensureUser(user) {
    let email;
    try {
        email = user.emails[0].value;
    } catch (e) {
        throw "No email for user?";
    }
    if (email in data.userPromises) {
        return data.userPromises[email];
    }
    const remove = () => {
        delete data.userPromises[email];
    };
    const promise = new Promise((resolve, reject) => {
        // make sure we get a chance to put the promise
        // into data.userPromises before resolving
        process.nextTick(() => {
            if (email) {
                console.log("serialized", email);
                data.User.findOne({ email: email }, { email: true }).then(doc => {
                    if (doc) {
                        resolve(email);
                        remove();
                        return;
                    }
                    let attemptCount = 10;
                    const attempt = () => {
                        generateId().then(id => {
                            data.User.create({ email: email, displayName: user.displayName, publicId: id, roles: 0 }).then(doc => {
                                console.log("created doc", doc);
                                resolve(email);
                                remove();
                            }).catch(err => {
                                console.error(err);
                                if (err.code == 11000) {
                                    // invalid id, try again
                                    console.error("attempting again", attemptCount);
                                    if (--attemptCount) {
                                        process.nextTick(attempt);
                                        return;
                                    }
                                }
                                reject(err);
                                remove();
                            });
                        }).catch(err => {
                            reject(err);
                            remove();
                        });
                    };
                    attempt();
                }).catch(err => {
                    reject(err);
                    remove();
                });
            }
        });
    });
    data.userPromises[email] = promise;
    return promise;
}

passport.serializeUser(function(user, done) {
    console.log("serializing", user);
    let promise;
    try {
        promise = ensureUser(user);
    } catch (err) {
        done(err, null);
    }
    if (promise) {
        promise.then(email => {
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

const Permission = {
    Private: 0,
    Public : 1
};

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

function ensureRole(role)
{
    return function(req, res, next) {
        const roles = (typeof role === "number") ? [role] : role;
        if (typeof req.user !== "object" || !req.user.email) {
            res.sendStatus(401);
            return;
        }
        data.User.findOne({ email: req.user.email, roles: { $bitsAllSet: roles } }).then(user => {
            if (!user) {
                res.sendStatus(401);
                return;
            } else {
                next(null);
            };
        }).catch(err => {
            res.sendStatus(500);
        });
    };
}

function checkPermissions(id, email) {
    return new Promise((resolve, reject) => {
        data.Image.findOne({ _id: id }, { metadata: true }).then(doc => {
            if (!doc) {
                resolve(false);
                return;
            }
            try {
                if (doc.metadata.permissions & Permission.Public) {
                    resolve(true);
                    return;
                }
            } catch(_) {
            }
            if (email) {
                data.User.findOne({ email: email, images: id }, { email: true }).then(doc => {
                    resolve(doc ? true : false);
                }).catch(err => {
                    reject(err);
                });
            } else {
                resolve(false);
            }
        }).catch(err => {
            reject(err);
        });
    });
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

function getImages(query) {
    return new Promise((resolve, reject) => {
        if (query.id) {
            data.User.aggregate([
                { $match: { publicId: query.id } },
                { $unwind: "$images" },
                { $lookup: {
                    localField: "images",
                    from: "fs.files",
                    foreignField: "_id",
                    as: "image"
                } },
                { $unwind: "$image" },
                { $match: { "image.metadata.permissions": Permission.Public } },
                { $group: {
                    _id: "$_id",
                    images: { $push: "$image" }
                } },
                { $project: { "images._id": 1 } }
            ]).then(images => {
                try {
                    resolve({ images: images[0].images.map(elem => {
                        return elem._id;
                    })});
                } catch (err) {
                    reject(err);
                }
            }).catch(err => {
                reject(err);
            });
        } else if (query.email) {
            data.User.findOne({ email: query.email }, { images: true }).then(images => {
                resolve(images);
            }).catch(err => {
                reject(err);
            });
        } else {
            reject("invalid query");
        }
    });
}

function authVerify(profile, connection, option) {
    return new Promise((resolve, reject) => {
        resolve(profile);
    });
}

module.exports = function(mongoose, option) {
    data.mongoose = mongoose;
    data.host = option("host");

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
        data.resizes.push(`${maxw}x${resized.height}`);
    });

    data.User = mongoose.model("User", {
        email: { type: String, required: true, index: true },
        publicId: { type: String, required: true, index: true, unique: true },
        displayName: String,
        roles: Number,
        images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Image" }]
    });
    const Roles = {
        Admin:     0x01,
        Moderator: 0x02
    };
    const RoleBits = {
        Admin:     0,
        Moderator: 1
    };

    const connection = mongoose.connection;
    const sessionSecret = option("session-secret");
    if (!sessionSecret) {
        console.error("Need a session secret");
        process.exit(1);
    }

    const multerStorage = require("multer-gridfs-storage")({
        db: connection.db,
        file: function(req, file) {
            if (req.body.permissions) {
                const perms = parseInt(req.body.permissions);
                if (!isNaN(perms))
                    return { metadata: { permissions: perms } };
            }
            return { metadata: { permissions: 0 } };
        }
    });
    const upload = multer({ storage: multerStorage });

    const auths = ["google"];
    const enabledAuths = [];
    auths.forEach(auth => {
        if (require(`./auth/${auth}`)(passport, connection, option, authVerify))
            enabledAuths.push(auth);
    });

    const app = express();
    app.use(require('express-session')({ secret: sessionSecret, resave: true, saveUninitialized: true }));
    app.use(passport.initialize());
    app.use(passport.session());

    const apiRouter = express.Router();
    apiRouter.get("/", (req, res) => {
        res.redirect("/images");
    });

    apiRouter.get("/auth", (req, res) => {
        // let out = {};
        // enabledAuths.forEach(auth => {
        //     out += `<div><a href="/auth/${auth}">${auth}</a></div>`;
        // });
        res.send(enabledAuths);
    });

    if (enabledAuths.indexOf("google") !== -1) {
        console.log("Setting up Google auth routes");
        apiRouter.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
        apiRouter.get('/auth/google/callback',
                passport.authenticate('google', { failureRedirect: '/' }),
                function(req, res) {
                    // Successful authentication, redirect home.
                    res.redirect('/');
                });
    }

    apiRouter.post("/images/upload", ensureAuthenticated, upload.array("photos", 12), (req, res) => {
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
    apiRouter.get("/images/:id", (req, res) => {
        getImages({ id: req.params.id }).then(images => {
            try {
                if (images instanceof Array) {
                    res.send(images);
                } else if (images.images instanceof Array) {
                    res.send(images.images);
                }
            } catch (err) {
                res.send(500);
                throw err.message;
            }
        }).catch(err => {
            console.error(err);
            res.sendStatus(404);
        });
    });
    apiRouter.get("/images", ensureAuthenticated, (req, res) => {
        getImages({ email: req.user.email }).then(images => {
            try {
                if (images instanceof Array) {
                    res.send(images);
                } else if (images.images instanceof Array) {
                    res.send(images.images);
                }
            } catch (e) {
                res.send(500);
                throw e.message;
            }
        }).catch(err => {
            console.error(err);
            res.sendStatus(404);
        });
    });
    apiRouter.get("/resizes", (req, res) => {
        res.send({ host: data.host, resizes: data.resizes });
    });
    apiRouter.get("/permissions", (req, res) => {
        res.send(Permission);
    });
    apiRouter.get("/user", ensureAuthenticated, (req, res) => {
        data.User.findOne({ email: req.user.email }, { displayName: true, publicId: true }).then(doc => {
            //console.log(doc);
            res.send({
                email: req.user.email,
                displayName: doc.displayName,
                publicId: doc.publicId,
                roles: doc.roles
            });
        }).catch(err => {
            console.error(err);
            res.sendStatus(500);
        });
    });
    apiRouter.get("/meta/set/:key/:value/:id", ensureAuthenticated, (req, res) => {
        let value;
        const key = req.params.key;
        switch (key) {
        case "permissions":
            value = parseInt(req.params.value);
            if (isNaN(value)) {
                res.sendStatus(500);
                return;
            }
            break;
        default:
            res.sendStatus(500);
            return;
        }
        const id = makeObjectID(req.params.id);
        if (!id) {
            res.sendStatus(500);
            return;
        }
        // check that this really is our image
        data.User.findOne({ email: req.user.email, images: id }, { email: true }).then(doc => {
            if (!doc) {
                res.sendStatus(404);
                return;
            }
            // we're good to update
            data.Image.findOneAndUpdate({ _id: id }, { $set: { [`metadata.${key}`]: value } }, { new: true }).then(doc => {
                try {
                    if (doc.metadata[key] === value) {
                        res.send({ ok: true });
                    } else {
                        throw new Error(`metadata mismatch ${doc.metadata[key]} ${value}`);
                    }
                } catch (err) {
                    console.error(`error matching metadata for ${key} ${id}`, err);
                    res.sendStatus(500);
                }
            }).catch(err => {
                console.error(`error updating metadata for ${key} ${id}`, err);
                res.sendStatus(500);
            });
        });
    });
    apiRouter.get("/meta/get/:id", ensureAuthenticated, (req, res) => {
        const id = makeObjectID(req.params.id);
        if (!id) {
            res.sendStatus(500);
            return;
        }
        // check that this really is our image
        data.User.findOne({ email: req.user.email, images: id }, { email: true }).then(doc => {
            if (!doc) {
                res.sendStatus(404);
                return;
            }
            data.Image.findOne({ _id: id }, { metadata: true }).then(doc => {
                if (doc) {
                    res.send(doc.metadata);
                } else {
                    res.sendStatus(500);
                }
            }).catch(err => {
                console.error(`error getting metadata for ${id}`, err);
                res.sendStatus(500);
            });
        }).catch(err => {
            console.error(`error getting metadata (image) for ${id}`, err);
            res.sendStatus(500);
        });
    });
    apiRouter.get("/delete/:id", ensureAuthenticated, (req, res) => {
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
    apiRouter.get("/admin", ensureRole(RoleBits.Admin), (req, res) => {
        res.send({ ok: true });
    });

    app.use("/api/v1", apiRouter);

    app.get("/raw/:id", (req, res) => {
        //data.Image.findOne({ _id: req.params.id }
        const id = makeObjectID(req.params.id);
        if (!id) {
            res.sendStatus(500);
            return;
        }
        console.log(id);
        checkPermissions(id, req.user && req.user.email).then(ok => {
            if (!ok) {
                res.sendStatus(404);
                return;
            }
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
        }).catch(err => {
            console.error("error checking permissions", id, err);
            res.sendStatus(404);
        });
    });
    app.get("/resized/:width/:id", (req, res) => {
        const id = makeObjectID(req.params.id);
        if (!id) {
            res.sendStatus(500);
            return;
        }
        checkPermissions(id, req.user && req.user.email).then(ok => {
            if (!ok) {
                res.sendStatus(404);
                return;
            }
            const width = parseInt(req.params.width);
            if (!(width in data.ResizedImage)) {
                res.sendStatus(404);
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
        }).catch(err => {
            console.error("error checking permissions", id, err);
            res.sendStatus(404);
        });
    });

    const port = option.int("port", 3001);
    app.listen(port, () => {
        console.log(`Listening on ${port}`);
    });
};

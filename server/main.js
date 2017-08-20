/*global require,process*/

const mongoose = require("mongoose");
const option = require("./options")(require('minimist')(process.argv.slice(2)), "imghost");
const app = require("./app");

const mongourl = option("mongo-url");
if (!mongourl) {
    console.error("Needs mongo-url");
    process.exit(1);
}
if (!option("host")) {
    console.error("Needs host");
    process.exit(1);
}

mongoose.Promise = Promise;
mongoose.connect(mongourl, { useMongoClient: true }).then(() => {
    app(mongoose, option);
}).catch(err => {
    console.error("failed to open db", err);
});

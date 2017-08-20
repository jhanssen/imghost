/*global require,module,process*/

class Options {
    constructor(argv, prefix) {
        this.argv = argv;
        this.prefix = prefix ? (prefix + "-") : "";
    }

    value(name) {
        // foo-bar becomes FOO_BAR as env
        if (name in this.argv)
            return this.argv[name];
        const envname = (this.prefix + name).replace(/-/g, "_").toUpperCase();
        if (envname in process.env)
            return process.env[envname];
        return undefined;
    }
}

const data = {};

module.exports = function(argv, prefix) {
    data.options = new Options(argv, prefix);
    let ret = function(name) {
        return data.options.value(name);
    };
    ret.int = function(name, defaultValue) {
        const v = parseInt(data.options.value(name));
        if (typeof v === "number" && !isNaN(v))
            return v;
        return defaultValue;
    };
    return ret;
};

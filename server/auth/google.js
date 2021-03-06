/*global require,module*/

const GoogleStrategy = require('passport-google-oauth20').Strategy;

module.exports = function(passport, connection, option, verify) {
    const client = option("google-client");
    const secret = option("google-secret");
    const host = option("host");
    if (!client || !secret) {
        console.error("Google auth disabled");
        return false;
    }
    console.log("Google auth enabled");
    passport.use(new GoogleStrategy({
        clientID: client,
        clientSecret: secret,
        callbackURL: `${host}/api/v1/auth/google/callback`
    }, function(accessToken, refreshToken, profile, cb) {
        verify(profile, connection, option).then(profile => {
            cb(null, profile);
        }).catch(err => {
            cb(err, null);
        });
    }));
    return true;
};

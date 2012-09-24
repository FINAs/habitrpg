// Generated by CoffeeScript 1.3.3
var content, derby, req, schema;

derby = require('derby');

schema = require('../app/schema');

content = require('../app/content');

req = void 0;

module.exports.setRequest = function(r) {
  return req = r;
};

module.exports.newUserAndPurl = function() {
  var acceptableUid, model, sess, uidParam;
  model = req.getModel();
  sess = model.session;
  uidParam = req.url.split('/')[1];
  if (!sess.userId) {
    sess.userId = derby.uuid();
    model.set("users." + sess.userId, schema.newUserObject());
  }
  acceptableUid = require('guid').isGuid(uidParam) || (uidParam === '3');
  if (acceptableUid && sess.userId !== uidParam && !(sess.habitRpgAuth && sess.habitRpgAuth.facebook)) {
    return sess.userId = uidParam;
  }
};

module.exports.setupEveryauth = function(everyauth) {
  everyauth.debug = true;
  everyauth.everymodule.findUserById(function(id, callback) {
    return callback(null, null);
  });
  everyauth.facebook.appId(process.env.FACEBOOK_KEY).appSecret(process.env.FACEBOOK_SECRET).findOrCreateUser(function(session, accessToken, accessTokenExtra, fbUserMetadata) {
    var model, q;
    session.habitRpgAuth || (session.habitRpgAuth = {});
    session.habitRpgAuth.facebook = fbUserMetadata.id;
    model = req.getModel();
    q = model.query('users').withEveryauth('facebook', fbUserMetadata.id);
    model.fetch(q, function(err, user) {
      var id;
      id = user && user.get() && user.get()[0].id;
      console.log({
        err: err,
        id: id,
        fbUserMetadata: fbUserMetadata
      });
      if (id && id !== session.userId) {
        return session.userId = id;
      } else {
        model.setNull("users." + session.userId + ".auth", {
          'facebook': {}
        });
        return model.set("users." + session.userId + ".auth.facebook", fbUserMetadata);
      }
    });
    return fbUserMetadata;
  }).redirectPath("/");
  return everyauth.everymodule.handleLogout(function(req, res) {
    if (req.session.habitRpgAuth && req.session.habitRpgAuth.facebook) {
      req.session.habitRpgAuth.facebook = void 0;
    }
    req.session.userId = void 0;
    req.logout();
    return this.redirect(res, this.logoutRedirectPath());
  });
};

module.exports.setupQueries = function(store) {
  store.query.expose('users', 'withId', function(id) {
    return this.byId(id);
  });
  store.query.expose('users', 'withEveryauth', function(provider, id) {
    console.log({
      withEveryauth: {
        provider: provider,
        id: id
      }
    });
    return this.where("auth." + provider + ".id").equals(id);
  });
  return store.queryAccess('users', 'withEveryauth', function(methodArgs) {
    var accept;
    accept = arguments[arguments.length - 1];
    return accept(true);
  });
};

module.exports.setupAccessControl = function(store) {
  store.accessControl = true;
  store.readPathAccess('users.*', function() {
    var captures, next;
    if (!(this.session && this.session.userId)) {
      return;
    }
    captures = arguments[0];
    next = arguments[arguments.length - 1];
    return next(captures === this.session.userId);
  });
  return store.writeAccess('*', 'users.*', function() {
    var captures, next, pathArray;
    if (!(this.session && this.session.userId)) {
      return;
    }
    captures = arguments[0];
    next = arguments[arguments.length - 1];
    pathArray = captures.split('.');
    return next(pathArray[0] === this.session.userId);
  });
};
var crypto = require('crypto');

/*
 * Restrict paths
 */

exports.restrict = function(req, res, next){
  if(req.isAuthenticated()) next();
  else res.redirect('/');
};

/*
 * Generates a URI Like key for a grocerylist
 */       

exports.genGrocerylistKey = function() {
  var shasum = crypto.createHash('sha1');
  shasum.update(Date.now().toString());
  return shasum.digest('hex').substr(0,6);
};

/*
 * Grocerylist name is valid
 */

exports.validGrocerylistName = function(req, res, fn) {
  req.body.grocerylist_name = req.body.grocerylist_name.trim();
  var nameLen = req.body.grocerylist_name.length;

  if(nameLen < 255 && nameLen >0) {
    fn();
  } else {
    res.redirect('back');
  }
};

/*
 * Checks if grocerylist exists
 */
exports.grocerylistExists = function(req, res, client, fn) {
  client.hget('balloons:grocerylists:keys', encodeURIComponent(req.body.grocerylist_name), function(err, grocerylistKey) {
    if(!err && grocerylistKey) {
      res.redirect( '/' + grocerylistKey );
    } else {
      fn()
    }
  });
};

/*
 * Creates a grocerylist
 */       
exports.createGrocerylist = function(req, res, client) {
  var grocerylistKey = exports.genGrocerylistKey()
    , grocerylist = {
        key: grocerylistKey,
        name: req.body.grocerylist_name,
        admin: req.user.provider + ":" + req.user.username,
        locked: 0,
        online: 0
      };

  client.hmset('grocerylists:' + grocerylistKey + ':info', grocerylist, function(err, ok) {
    if(!err && ok) {
      client.hset('balloons:grocerylists:keys', encodeURIComponent(req.body.grocerylist_name), grocerylistKey);
      client.sadd('balloons:public:grocerylists', grocerylistKey);
      res.redirect('/' + grocerylistKey);
    } else {
      res.send(500);
    }
  });
};

/*
 * Get Grocerylist Info
 */

exports.getGrocerylistInfo = function(req, res, client, fn) {
  client.hgetall('grocerylists:' + req.params.id + ':info', function(err, grocerylist) {
    if(!err && grocerylist && Object.keys(grocerylist).length) fn(grocerylist);
    else res.redirect('back');
  });
};

exports.getPublicGrocerylistsInfo = function(client, fn) {
  client.smembers('balloons:public:grocerylists', function(err, publicGrocerylists) {
    var grocerylists = []
      , len = publicGrocerylists.length;
    if(!len) fn([]);

    publicGrocerylists.sort(exports.caseInsensitiveSort);

    publicGrocerylists.forEach(function(grocerylistKey, index) {
      client.hgetall('grocerylists:' + grocerylistKey + ':info', function(err, grocerylist) {
        // prevent for a grocerylist info deleted before this check
        if(!err && grocerylist && Object.keys(grocerylist).length) {
          // add grocerylist info
          grocerylists.push({
            key: grocerylist.key || grocerylist.name, // temp
            name: grocerylist.name,
            online: grocerylist.online || 0
          });

          // check if last grocerylist
          if(grocerylists.length == len) fn(grocerylists);
        } else {
          // reduce check length
          len -= 1;
        }
      });
    });
  });
};
/*
 * Get connected users at grocerylist
 */

exports.getUsersInGrocerylist = function(req, res, client, grocerylist, fn) {
  client.smembers('grocerylists:' + req.params.id + ':online', function(err, online_users) {
    var users = [];

    online_users.forEach(function(userKey, index) {
      client.get('users:' + userKey + ':status', function(err, status) {
        var msnData = userKey.split(':')
          , username = msnData.length > 1 ? msnData[1] : msnData[0]
          , provider = msnData.length > 1 ? msnData[0] : "twitter";

        users.push({
            username: username,
            provider: provider,
            status: status || 'available'
        });
      });
    });

    fn(users);

  });
};

/*
 * Get public grocerylists
 */

exports.getPublicGrocerylists = function(client, fn){
  client.smembers("balloons:public:grocerylists", function(err, grocerylists) {
    if (!err && grocerylists) fn(grocerylists);
    else fn([]);
  });
};
/*
 * Get User status
 */

exports.getUserStatus = function(user, client, fn){
  client.get('users:' + user.provider + ":" + user.username + ':status', function(err, status) {
    if (!err && status) fn(status);
    else fn('available');
  });
};

/*
 * Enter to a grocerylist
 */

exports.enterGrocerylist = function(req, res, grocerylist, users, grocerylists, status){
  res.locals({
    grocerylist: grocerylist,
    grocerylists: grocerylists,
    user: {
      nickname: req.user.username,
      provider: req.user.provider,
      status: status
    },
    users_list: users
  });
  res.render('grocerylist');
};

/*
 * Sort Case Insensitive
 */

exports.caseInsensitiveSort = function (a, b) { 
   var ret = 0;

   a = a.toLowerCase();
   b = b.toLowerCase();

   if(a > b) ret = 1;
   if(a < b) ret = -1; 

   return ret;
};

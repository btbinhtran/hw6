
/*
 * Module dependencies
 */

var app = module.parent.exports.app
  , passport = require('passport')
  , client = module.parent.exports.client
  , config = require('../config')
  , utils = require('../utils');

/*
 * Homepage
 */

app.get('/', function(req, res, next) {
  if(req.isAuthenticated()){
    client.hmset(
        'users:' + req.user.provider + ":" + req.user.username
      , req.user
    );
    res.redirect('/grocerylists');
  } else{
    res.render('index');
  }
});

/*
 * Authentication routes
 */

app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/'
  })
);

if(config.auth.twitter.consumerkey.length) {
  app.get('/auth/twitter', passport.authenticate('twitter'));

  app.get('/auth/twitter/callback', 
    passport.authenticate('twitter', {
      successRedirect: '/',
      failureRedirect: '/'
    })
  );
}

if(config.auth.facebook.clientid.length) {
  app.get('/auth/facebook', passport.authenticate('facebook'));

  app.get('/auth/facebook/callback', 
    passport.authenticate('facebook', {
      successRedirect: '/',
      failureRedirect: '/'
    })
  );
}

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

/*
 * Grocerylists list
 */

app.get('/grocerylists', utils.restrict, function(req, res) {
  utils.getPublicGrocerylistsInfo(client, function(grocerylists) {
    res.render('grocerylist_list', { grocerylists: grocerylists });
  });
});

/*
 * Create a grocery list
 */

app.post('/create', utils.restrict, function(req, res) {
  utils.validGrocerylistName(req, res, function(grocerylistKey) {
    utils.grocerylistExists(req, res, client, function() {
      utils.createGrocerylist(req, res, client);
    });
  });
});

/*
 * Join a grocerylist
 */

app.get('/:id', utils.restrict, function(req, res) {
  utils.getGrocerylistInfo(req, res, client, function(grocerylist) {
    utils.getUsersInGrocerylist(req, res, client, grocerylist, function(users) {
      utils.getPublicGrocerylistsInfo(client, function(grocerylists) {
        utils.getUserStatus(req.user, client, function(status) {
          utils.enterGrocerylist(req, res, grocerylist, users, grocerylists, status);
        });
      });
    });
  });
});


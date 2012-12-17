
/*
 * Module dependencies
 */

var parent = module.parent.exports 
  , app = parent.app
  , server = parent.server
  , express = require('express')
  , client = parent.client
  , sessionStore = parent.sessionStore
  , sio = require('socket.io')
  , parseCookies = require('connect').utils.parseSignedCookies
  , cookie = require('cookie')
  , config = require('./config.json')
  , fs = require('fs');


var io = sio.listen(server);
io.set('authorization', function (hsData, accept) {
  if(hsData.headers.cookie) {
    var cookies = parseCookies(cookie.parse(hsData.headers.cookie), config.session.secret)
      , sid = cookies['balloons'];

    sessionStore.load(sid, function(err, session) {
      if(err || !session) {
        return accept('Error retrieving session!', false);
      }

      hsData.balloons = {
        user: session.passport.user,
        grocerylist: /\/(?:([^\/]+?))\/?$/g.exec(hsData.headers.referer)[1]
      };

      return accept(null, true);
      
    });
  } else {
    return accept('No cookie transmitted.', false);
  }
});

io.configure(function() {
  io.set('store', new sio.RedisStore({client: client}));
  io.enable('browser client minification');
  io.enable('browser client gzip');
});


io.sockets.on('connection', function (socket) {
  var hs = socket.handshake
    , nickname = hs.balloons.user.username
    , provider = hs.balloons.user.provider
    , userKey = provider + ":" + nickname
    , grocerylist_id = hs.balloons.grocerylist
    , now = new Date()
    // Chat Log handler
    , groceryitemlogFileName = './groceries/' + grocerylist_id + (now.getFullYear()) + (now.getMonth() + 1) + (now.getDate()) + ".txt"
    , groceryitemlogWriteStream = fs.createWriteStream(groceryitemlogFileName, {'flags': 'a'});

  socket.join(grocerylist_id);

  client.sadd('sockets:for:' + userKey + ':at:' + grocerylist_id, socket.id, function(err, socketAdded) {
    if(socketAdded) {
      client.sadd('socketio:sockets', socket.id);
      client.sadd('grocerylists:' + grocerylist_id + ':online', userKey, function(err, userAdded) {
        if(userAdded) {
          client.hincrby('grocerylists:' + grocerylist_id + ':info', 'online', 1);
          client.get('users:' + userKey + ':status', function(err, status) {
            io.sockets.in(grocerylist_id).emit('new user', {
              nickname: nickname,
              provider: provider,
              status: status || 'available'
            });
          });
        }
      });
    }
  });

  socket.on('my msg', function(data) {
    var no_empty = data.msg.replace("\n","");
    if(no_empty.length > 0) {
      var groceryitemlogRegistry = {
        type: 'message',
        from: userKey,
        atTime: new Date(),
        withData: data.msg
      }

      groceryitemlogWriteStream.write(JSON.stringify(groceryitemlogRegistry) + "\n");
      
      io.sockets.in(grocerylist_id).emit('new msg', {
        nickname: nickname,
        provider: provider,
        msg: data.msg
      });        
    }   
  });

  socket.on('set status', function(data) {
    var status = data.status;

    client.set('users:' + userKey + ':status', status, function(err, statusSet) {
      io.sockets.emit('user-info update', {
        username: nickname,
        provider: provider,
        status: status
      });
    });
  });

  socket.on('history request', function() {
    var history = [];
    var tail = require('child_process').spawn('tail', ['-n', 5, groceryitemlogFileName]);
    tail.stdout.on('data', function (data) {
      var lines = data.toString('utf-8').split("\n");
      
      lines.forEach(function(line, index) {
        if(line.length) {
          var historyLine = JSON.parse(line);
          history.push(historyLine);
        }
      });

      socket.emit('history response', {
        history: history
      });
    });
  });

  socket.on('disconnect', function() {
    // 'sockets:at:' + grocerylist_id + ':for:' + userKey
    client.srem('sockets:for:' + userKey + ':at:' + grocerylist_id, socket.id, function(err, removed) {
      if(removed) {
        client.srem('socketio:sockets', socket.id);
        client.scard('sockets:for:' + userKey + ':at:' + grocerylist_id, function(err, members_no) {
          if(!members_no) {
            client.srem('grocerylists:' + grocerylist_id + ':online', userKey, function(err, removed) {
              if (removed) {
                client.hincrby('grocerylists:' + grocerylist_id + ':info', 'online', -1);
                groceryitemlogWriteStream.destroySoon();
                io.sockets.in(grocerylist_id).emit('user leave', {
                  nickname: nickname,
                  provider: provider
                });
              }
            });
          }
        });
      }
    });
  });
});

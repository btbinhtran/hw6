
/*
 * Initialize the application
 */

/*
 * Module dependencies
 */

var fs = require('fs');


/*
 * Initialize the 
 *
 * @param {Object} Redis client instance
 * API @public
 */

module.exports = function(client){

  /*
   * Clean all forgoten sockets in Redis.io
   */

  // Delete all users sockets from their lists
  client.keys('sockets:for:*', function(err, keys) {
    if(keys.length) client.del(keys);
    console.log('Deletion of sockets reference for each user >> ', err || "Done!");
  });

  // No one is online when starting up
  client.keys('grocerylists:*:online', function(err, keys) {
    var grocerylistNames = [];
    
    if(keys.length) {
      grocerylistNames = grocerylistNames.concat(keys);
      client.del(keys);
    }

    grocerylistNames.forEach(function(grocerylistName, index) {
      var key = grocerylistName.replace(':online', ':info');
      client.hset(key, 'online', 0);
    });

    console.log('Deletion of online users from grocerylists >> ', err || "Done!");
  });

  // Delete all socket.io's sockets data from Redis
  client.smembers('socketio:sockets', function(err, sockets) {
    if(sockets.length) client.del(sockets);
    console.log('Deletion of socket.io stored sockets data >> ', err || "Done!");
  });

  /*
   * Create 'groceries' dir
   */
  fs.mkdir('./groceries');

};


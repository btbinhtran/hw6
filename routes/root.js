
/*
 * GET home page.
 */
var routes = function(app) {
  app.get('/', function(req, res) {
    
    res.render('index', {
      title: 'Express',
      port: app.get('port'),
      ip: app.get('ip')
    });
  });
};

module.exports = routes;

/*
 * GET home page.
 */
var routes = function(app) {
  app.get('/', function(req, res) {
    res.render('index', {
      title: 'Express',
      port: 8080
    });
  });
};

module.exports = routes;
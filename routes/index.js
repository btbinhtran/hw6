
/*
 * GET home page.
 */
routes = function(app) {
  app.get('/', function(req, res) {
    res.render('index', {
      title: 'Express'
    });
  });
};

module.exports = routes;
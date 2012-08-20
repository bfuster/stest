var classifier = require('classifier')
  , twitter = require('ntwitter')
  , mongoose = require('mongoose')
  , io = require('socket.io').listen(4999);

var db = mongoose.createConnection('localhost', 'test');

var schema = mongoose.Schema({ text: 'string', from: 'string' });
var Msg = db.model('Msg', schema);

var bayes = new classifier.Bayesian({
  backend: {
    type: 'Redis',
    options: {
      hostname: 'localhost', // default
      port: 6379,            // default
      name: 'sentiment'      // namespace for persisting
    }
  }
});

var clt = function() { console.log('trained'); }

/*bayes.train('legal', 'good', clt);
bayes.train('bom', 'good', clt);
bayes.train('feio', 'bad', clt);
bayes.train('chato', 'bad', clt);
bayes.train('foda', 'good', clt);
bayes.train('animal', 'good', clt);
bayes.train('escroto', 'bad', clt);
bayes.train('zuado', 'bad', clt);
bayes.train('nao gostei', 'bad', clt);
bayes.train(':(', 'bad', clt);
bayes.train(':)', 'good', clt);
bayes.train(':D', 'good', clt);
bayes.train(':P', 'good', clt);
bayes.train('o/', 'good', clt);
bayes.train('feio', 'bad', clt);
bayes.train('nao feio', 'good', clt);*/

var twit = new twitter({
  consumer_key: 'fSCtLpbUSxYRqJKJTTBkw',
  consumer_secret: 'gshKVNJDAYemjsBPV2pP06h1TilqptWRszI8lUMM4c',
  access_token_key: '19590078-mHGInQz4rRYuhxv3qUYdrp1usMVb4I8EiuL8sA0pC',
  access_token_secret: 'ApOie9G8BHlBAk21YFMzMEBc0JHUs5saXNZqWddMus4'
});

io.sockets.on('connection', function (socket) {
	twit.stream('statuses/filter', {'track':'dropsapp'}, function(stream) {
		stream.on('data', function (data) {
			
			var text = data.text;
			bayes.classify(text, function(category) {
				console.log("Text %s classified as %s", text, category);
				socket.emit('input', {data: data, category: category});	
			});
			
		});
	});
});
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};

/*
 * Train new data
 */
exports.train = function(req, res) {

	var msg = req.param('msg')
	  , type = req.param('type')

	bayes.train(msg, type, function() {
  		console.log('trained');
  		res.send(200);
	});

};

/*
 * Classify
 */
exports.classify = function(req, res) {

	var msg = req.param('msg');

	bayes.classify(msg, function(category) {
		res.send({result: category});
	});

};

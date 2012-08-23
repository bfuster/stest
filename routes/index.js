var classifier = require('classifier')
  , twitter = require('ntwitter')
  , mongoose = require('mongoose')
  , io = require('socket.io').listen(4999)
  , net = require('net')
  , _ = require('underscore');

var db = mongoose.createConnection('localhost', 'test')
  , ObjectId = mongoose.Types.ObjectId;

var posSchema = mongoose.Schema({
	word: String,
	raw: String,
	pos: String,
	points: String,
	type: String
});
var schema = mongoose.Schema({ 
	text: String, 
	when: {type: Date, default: Date.now},
	category: String,
	pos: [posSchema]
});


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

/*
bayes.train('legal', 'good', clt);
bayes.train('bom', 'good', clt);
bayes.train('feio', 'bad', clt);
bayes.train('é feio', 'bad', clt);
bayes.train('bem feio', 'bad', clt);
bayes.train('muito feio', 'bad', clt);
bayes.train('chato', 'bad', clt);
bayes.train('é chato', 'bad', clt);
bayes.train('foda', 'good', clt);
bayes.train('animal', 'good', clt);
bayes.train('escroto', 'bad', clt);
bayes.train('zuado', 'bad', clt);
bayes.train('gostei', 'good', clt);
bayes.train(':(', 'bad', clt);
bayes.train(':)', 'good', clt);
bayes.train(':D', 'good', clt);
bayes.train(':P', 'good', clt);
bayes.train('o/', 'good', clt);
bayes.train('feio', 'bad', clt);
*/

var twit = new twitter({
  consumer_key: 'fSCtLpbUSxYRqJKJTTBkw',
  consumer_secret: 'gshKVNJDAYemjsBPV2pP06h1TilqptWRszI8lUMM4c',
  access_token_key: '19590078-mHGInQz4rRYuhxv3qUYdrp1usMVb4I8EiuL8sA0pC',
  access_token_secret: 'ApOie9G8BHlBAk21YFMzMEBc0JHUs5saXNZqWddMus4'
});

io.sockets.on('connection', function (socket) {
	twit.stream('statuses/filter', {'track':'socialtrkr'}, function(stream) {
		stream.on('data', function (data) {
			console.log('data from twitter!');
			var text = data.text;
			var msg = new Msg({
				text: text,
				category: '',
			});

			freeling(text, function(err, results) {
				if (err) throw err;
				console.log('results found: %j', results);
				msg.pos = results;
				msg.save();
				socket.emit('input', msg);
			});

			/*bayes.classify(text, function(category) {
				
				msg.save();

				console.log("Text %s classified as %s", text, category);
				socket.emit('input', msg);//{data: data, category: category});

			});*/
			
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
	  , _id = req.param('_id');

	bayes.train(msg, type, function() {
		Msg.update({_id: new ObjectId(_id)}, {category: type}, {upsert: false, multi: false}, function(affected) {
			console.log('affected: %d', affected)
	  		console.log('trained');
	  		res.send(200);
		});
	});

};

exports.msgs = function(req, res) {
	Msg.find({}).sort('when').exec(function(err, msgs) {
		res.send({msgs: msgs});
	});
}

/*
 * Classify
 */
exports.classify = function(req, res) {

	var msg = req.param('msg');

	bayes.classify(msg, function(category) {
		res.send({result: category});
	});

};

var tagset_1pos = {
	'A': 'Adjetivo',
	'R': 'Adverbio',
	'D': 'Determinante',
	'N': 'Nome',
	'V': 'Verbo',
	'P': 'Pronome',
	'C': 'Conjuncao',
	'I': 'Interjeicao',
	'S': 'Preposicao',
	'F': 'Pontuacao',
	'Z': 'Numero'
}

var freeling = function(msg, callback) {

	var socket = new net.Socket();
	socket.on('connect', function() {
		console.log('connected');
		socket.end(msg, 'utf8', function() {
			console.log('write was done!');
		});
	});
	socket.on('error', function(err) {
		callback("Erro ao tentar usar o freeling: " + err);
	});
	socket.on('data', function(data) {

		var str = new String(data);
		if (str.indexOf('FL-SERVER-READY') <= -1) {
			var data_arr = new String(data).split('\n');

			var results = [];
			_.each(data_arr, function(item) {
				var words = item.split(' ');
				if (words.length == 4) {
					var obj = {
						word: words[0],
						raw: words[1],
						pos: words[2],
						points: words[3]
					};
					var stpos = obj.pos[0];
					obj.type = tagset_1pos[stpos];
					results.push(obj);
				}
			});
			callback(null, results);
		}
	});
	socket.connect(50005, '192.168.56.101');

};

var tessel = require('tessel');

var http = require("http");
var url = require('url');
var fs = require('fs');
var io = require('socket.io');

var climatelib = require('climate-si7020');
var climate = climatelib.use(tessel.port['A']);

var server = http.createServer(function(request, response) {
  console.log('Connection');
  var path = url.parse(request.url).pathname;

  switch (path) {
    case '/':
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.write('Hello, World.');
      response.end();
      break;
    case '/final.html':
      fs.readFile(__dirname + path, function(error, data) {
        if (error){
          response.writeHead(404);
          response.write("opps this doesn't exist - 404");
        } else {
          response.writeHead(200, {"Content-Type": "text/html"});
          response.write(data, "utf8");
        }
        response.end();
      });
      break;
    default:
      response.writeHead(404);
      response.write("QQQpps this doesn't exist - 404");
      response.end();
      break;
  }
});

server.listen(8001);
console.log("running at 192.168.1.101:8001");


var serv_io = io.listen(server);

climate.on('ready', function () {
    console.log('Connected to climate module');
	serv_io.sockets.on('connection', function (socket) {
		// Loop forever
		console.log("connected");
		setImmediate(function loop () {
			climate.readTemperature('f', function (err, temp) {
				climate.readHumidity(function (err, humid) {
					data = checkBoundMakeData(humid.toFixed(4), temp.toFixed(4));
					console.log('H: '+data.H +' Hcheck:' + data.Hcheck + ' D:' + data.D + ' Dcheck:' + data.Dcheck );
					if(data.Hcheck == 1){
						tessel.led[2].on();
					}
					else{
						tessel.led[2].off();
					}
					
					if(data.Dcheck == 1){
						tessel.led[3].on();
					}
					else{
						tessel.led[3].off();
					}
					
					socket.emit('dataStream', data);
					setTimeout(loop, 1000);
				});
			});
		});
	});
});

function checkBoundMakeData(tempH, tempD){
    var Hcheck = 0,
        Dcheck = 0,
        upperBound = {
        'H': 100, //warning when humidity more than 50%
        'D': 86 //warning while degree more than 104 oF (40 oC)
        };
    
    if (tempH >= upperBound['H']) {
        Hcheck = 1;
    } else {
        Hcheck = 0;
    }
    
    if (tempD >= upperBound['D']) {
        Dcheck = 1;
    } else {
        Dcheck = 0;
    }
    
    return {
        'H': tempH,
        'Hcheck': Hcheck,
        'D': tempD,
        'Dcheck': Dcheck
    }
    
}
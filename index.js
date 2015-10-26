var util       = require('util');
var readline   = require('readline');
var colors     = require('colors');
var url        = require('url');
var request    = require('request');
var prettyjson = require('prettyjson');


/*
:help, :h, ?, h                  help
:quit, :q, q                   quit
:clear,:c, c                   clear config

GET, get, G, g            GET
POST, post, P, p          POST

http://, https://           set host
/rest/api/action
*/

colors.setTheme({
  silly  : 'rainbow',
  input  : 'grey',
  verbose: 'cyan',
  prompt : 'grey',
  info   : 'green',
  data   : 'grey',
  help   : 'cyan',
  warn   : 'yellow',
  debug  : 'blue',
  error  : 'red'
});
var _G   = {};
var init = function () {
  return {
    PROTOCOL: 'http:',
    HOST    : 'localhost',
    METHOD  : 'POST',
    TIMEOUT : 10 * 1000,
    PROMOT  : function () {
      var protocol = this.PROTOCOL === 'http:' ? '' : this.PROTOCOL + '//';
      return util.format("%s %s%s $ ".bold, this.METHOD.info, protocol,this.HOST.red);
    },
    COMMANDS: [':help', ':h', '?', 'h', ':quit', ':q', 'q', ':clear', ':c', 'c', 'GET', 'G', 'g', 'get', 'POST', 'P', 'p', 'post'],
    CLIENT  : function () {
      // return this.METHOD === 'GET' ? request.get : request.post;
      return this.PROTOCOL === 'http:' ? http.request : https.request;
    },
    CONNECTING: false,
  };
}
var help = function () {
  console.log("Usage: [Cmd] [Method] URL [Item [Item]]\n".bold);
  console.log("Commands:".bold);
  console.log("  :help , :h, :?           Show help info".help);
  console.log("  :quit , :q               Quit".help);
  console.log("  :clear, :c               Clear config\n".help);
  console.log("  GET , G <URL>            HTTP GET".help);
  console.log("  POST, P <URL>            HTTP POST\n".help);
  console.log("  <URL:HOST/PATH>          Make HTTP request with current METHOD".help);
  if (_G.HOST.length) {
    console.log("  /api/action              When METHOD and HOST were set\n".help);
  }else{
    console.log("  /api/action              When METHOD and HOST both were set\n".input);
  }
};

var makeRequest = function (method, params, display) {
  _G.METHOD = method;
  if (!params.length) {
    display();
    return;
  }
  var URL = url.parse(params[0]);
  var href= URL.href;
  if (URL.protocol === null || URL.host === null) {
    href = url.resolve(_G.PROTOCOL + '//' + _G.HOST, URL.path);
    URL  = url.parse(href);
  }else{
    _G.PROTOCOL = URL.protocol
    _G.HOST     = URL.host;
  };


  console.log(util.format("\n%s %s\n".info, _G.METHOD.bold, href));

  _G.CONNECTING = true;

  request({
    method : _G.METHOD,
    uri    : href,
    timeout: _G.TIMEOUT,
    headers: {
      'Accept'      : 'application/json',
      'Content-Type': 'application/json',
      'User-Agent'  : 'dobby-cli/1.0.0',
    },
  }, function (err, resp, body) {
    _G.CONNECTING = false;
    if (err === null) {
      if (resp.headers['content-type'].indexOf('json') === -1) {
        display(JSON.stringify({Content: resp.headers['content-type']}));
      }else{
        display(body);
      }
    }else{
      if (err.code === 'ETIMEDOUT') {
        display('Connection TIMEOUT!'.error);
      } else if (err) {
        display(err);
      }
    }
    // console.log(err);
    // console.log(resp);
    // console.log(body);
    /*
  }).on('data', function (data) {
    console.log(data);
  }).on('response', function (resp) {
    console.log(resp);
    */
  });
};
var action = function (cmd, params, callback) {
  switch (cmd) {
    case ':help':case ':h':case '?':default:
      help();
      callback();
      break;
    case ':quit':case ':q':
      process.exit(0);
      break;
    case ':clear':case ':c':
      console.log("Reset configuration!".info);
      _G = init();
      callback();
      break;
    case 'GET':case 'G':case 'get':case 'g':
      makeRequest('GET', params, callback);
      break;
    case 'POST': case 'P':case 'post':case 'p':
      makeRequest('POST', params, callback);
      break;
  }
};

var parse = function (line, callback) {
  if (_G.CONNECTING) {
    return;
  }
  if (!line.length) {
    callback();
    return;
  }
  var commands = line.split(" ");
  if(_G.COMMANDS.filter(function (cmd) {return cmd == commands[0];}).length){
    action(commands[0], commands.splice(1), callback);
  } else {
    makeRequest(_G.METHOD, commands, callback);
  }
};
module.exports = {
  run: function () {
    _G = init();
    var term = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    term.setPrompt(_G.PROMOT());
    term.prompt();

    term.on('line', function(line) {
      parse(line.trim(), function (data) {
        if (data !== undefined) {
          // term.write(data);
          console.log(prettyjson.render(JSON.parse(data)));
          console.log('');
        }
        term.setPrompt(_G.PROMOT());
        term.prompt();
      });
    }).on('close', function() {
      console.log('Have a great day!');
      process.exit(0);
    });

  },
}

var util       = require('util');
var readline   = require('readline');
var colors     = require('colors');
var url        = require('url');
var request    = require('request');
var prettyjson = require('prettyjson');
_VERSION       = require('./package.json').version;

/*
Usage: [Cmd] [Method] URL [Item [Item]]

Commands:
  :help, :h, ?, h                 help
  :quit, :q, q                    quit
  :clear,:c, c                    clear config

  GET, get, G, g                  GET
  POST, post, P, p                POST

  http://, https://               set host
  /rest/api/action                request this path

[Item [Item]]:
  name:value                      HTTP headers
  name=value                      URL paramaters
  field@/dir/file                 From file
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
    PORT    : 80,
    METHOD  : 'POST',
    TIMEOUT : 10 * 1000,
    HEADERS : {
      'Accept'      : 'application/json',
      'Content-Type': 'application/json',
      'User-Agent'  : 'dobby-cli/' + _VERSION,
    },

    PROMOT  : function () {
      var protocol = this.PROTOCOL === 'http:' ? '' : this.PROTOCOL + '//';
      return util.format("%s %s%s $ ".bold, this.METHOD.info, protocol,this.HOST.red);
    },
    COMMANDS: [':help', ':h', '?', 'h',
              ':quit', ':q', 'q',
              ':clear', ':c', 'c',
              'GET', 'G', 'g', 'get',
              'POST', 'P', 'p', 'post'],
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
  console.log("  /api/action              When METHOD and HOST were set\n".help);
  console.log("Items:".bold);
  console.log("  name:value               HTTP headers".help);
  console.log("  name=value               HTTP headers".help);
  console.log("  field@dir/file           HTTP headers\n".help);
};

var makeRequest = function (params, display) {
  if (!params.length) {
    display();
    return;
  }
  var cmd = params[0];

  if (cmd.substr(0, 4) !== "http") {
    // URL action
    // console.log('URL action');
    // action(_G.METHOD, commands, callback);
    if (cmd.split('/')[0].split('.').length > 1){
      // Host action
      // console.log('Host action');
      cmd = _G.PROTOCOL + '//' + cmd;
      // action(_G.METHOD, commands, callback);
    } else if (cmd.split('/').length > 1) {
      // Path action
      // console.log('Path action');
      cmd = url.resolve(_G.PROTOCOL + '//' + _G.HOST, cmd);
      // action(_G.METHOD, commands, callback);
    } else {
      console.log(util.format('\nError: invalid command `%s`\n'.bold, params.join(' ').error));
      help();
      display();
      return;
    }
  }
  var URL = url.parse(cmd);
  var href= URL.href;

  console.log(util.format("\n%s %s\n".info, _G.METHOD.bold, href));

  _G.PROTOCOL   = URL.protocol;
  _G.PORT       = URL.port || 80;
  _G.HOST       = URL.hostname + (_G.PORT === 80 ? "" : ":"+_G.PORT);
  _G.CONNECTING = true;

  var Items = {PData: {}, PHeader: {}, PFile: {}};
  if (params.length > 1) {
    // Items here
    params.splice(1).reduce(function (items, p) {
      if (p.split(':').length === 2) {
        items['PHeader'][p.split(':')[0]] = p.split(':')[1];
      }else if(p.split('=').length === 2){
        items['PData'][p.split('=')[0]] = p.split('=')[1];
      }else if(p.split('@').length === 2){
        items['PFile'][p.split('@')[0]] = p.split('@')[1];
      };
      return items;
    }, Items);
  };

  var headers = _G.HEADERS;
  for (var key in Items['PHeader']) {
    if (Items['PHeader'].hasOwnProperty(key) && !headers.hasOwnProperty(key)) {
      headers[key] = Items['PHeader'][key];
    };
  };
  // console.log(Items['PData']);
  request({
      method : _G.METHOD,
      uri    : href,
      timeout: _G.TIMEOUT,
      headers: headers,
      // json: JSON.stringify(Items['PData']),
      json: Items['PData'],
    }, function (err, resp, body) {
      _G.CONNECTING = false;
      if (err === null) {
        if (resp.headers['content-type'].indexOf('json') === -1) {
          display(JSON.stringify({
            Message: 'You No JSON'.error,
            ContentType: util.format('< %s >'.bold, resp.headers['content-type']),
            }));
        }else{
          display(JSON.stringify(body));
        };
      }else{
        // if (err.code === 'ETIMEDOUT') {
        //   display(JSON.stringify({Error: 'Connection TIMEOUT!'.error}));
        // } else if (err) {
        display(JSON.stringify({Error: err}));
        // };
      }
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
      console.log("\nReset configuration!\n".info);
      _G = init();
      callback();
      break;
    case 'GET':case 'G':case 'get':case 'g':
      _G.METHOD = 'GET';
      makeRequest(params, callback);
      break;
    case 'POST': case 'P':case 'post':case 'p':
      _G.METHOD = 'POST';
      makeRequest(params, callback);
      break;
  }
};

var parse = function (line, callback) {
  if (_G.CONNECTING) {
    return;
  }
  if (!line.length) {
    return callback();
  };

  var commands = line.split(" ");
  if(_G.COMMANDS.filter(function (cmd) {return cmd == commands[0];}).length){
    // Cmd action
    // console.log('Command action :' + commands[0]);
    action(commands[0], commands.splice(1), callback);
  } else {
    action(_G.METHOD, commands, callback);
  };
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

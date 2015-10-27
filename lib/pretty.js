var colors = require('colors');
var util = require('util');

/*
option = {
  indentSize: 3,
  indentChar: ' ',
  showSymbol: true,
}
*/

colors.setTheme({
  symbol : 'grey',
  keyword: 'cyan',
  strval : 'green',
  numval : 'red',
});

module.exports = {
  option: {
    indentSize: 2,
    indentChar: ' ',
    showSymbol: true,
  },
  render: function (obj, option) {
    var option = option || {};
    this.option.indentSize = option.indentSize || this.option.indentSize;
    this.option.indentChar = option.indentChar || this.option.indentChar;
    this.option.showSymbol = option.showSymbol === false ? false : true;

    return this._prettyRender(obj, 1);
  },
  _prettyRender : function (obj, level, isItem) {
    var level = level || 1;
    switch (this.realTypeOf(obj)) {
      case 'Object':
        return this.renderObj(obj, level, isItem);
        break;
      case 'Array':
        return this.renderArray(obj, level, isItem);
        break;
      case 'String':
        return this.renderString(obj, level, isItem);
        break;
      default:
        return this.renderValue(obj, level, isItem);
    };
  },
  renderObj: function (obj, level, isItem) {
    var levelIndent = this.makeIndent((level-1)*this.option.indentSize);
    var itemIndents = !!isItem ? levelIndent + '- '.symbol : '';

    if (!Object.keys(obj).length) {
      return itemIndents + "{ }".symbol;
    }
    var body = "";
    var longestKey = Math.max.apply(null, Object.keys(obj).map(function (k) {return k.length;}));
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        body += util.format("%s%s%s\n", this.renderKey(k, level), this.makeIndent(longestKey+1-k.length),this._prettyRender(obj[k], level+1));
      }
    }
    return util.format("%s%s\n%s%s%s", itemIndents, "{".symbol, body, levelIndent, "}".symbol);
  },
  renderKey: function (k, level) {
    return util.format("%s%s:".keyword, this.makeIndent(level*this.option.indentSize), k.bold);
  },
  renderArray: function (arr, level, isItem) {
    var levelIndent = this.makeIndent((level-1)*this.option.indentSize);
    var itemIndents = !!isItem ? levelIndent + '- '.symbol : '';

    if (!arr.length) {
      return itemIndents + "[ ]".symbol;
    }
    var body = "";
    for (var i = 0; i < arr.length; i++) {
      body += util.format("%s\n", this._prettyRender(arr[i], level+1, true));
    }
    return util.format("%s%s\n%s%s%s", itemIndents, "[".symbol, body, this.makeIndent((level-1)*this.option.indentSize), "]".symbol)
  },
  renderString: function (s, level, isItem) {
    var itemIndents = !!isItem ? this.makeLevelIndent(level) + this.option.indentChar + '- '.symbol : '';
    return util.format("%s%s", itemIndents, s.toString().bold.strval);
  },
  renderValue: function (v, level, isItem) {
    var itemIndents = !!isItem ? this.makeLevelIndent(level) + this.option.indentChar + '- '.symbol : '';
    return util.format("%s%s", itemIndents, v.toString().bold.numval);
  },

  realTypeOf: function (obj, level) {
    var typeStr = Object.prototype.toString.call(obj);
    return typeStr.slice(8, typeStr.length-1);
  },
  makeLevelIndent: function (level) {
    return this.makeIndent((level-1) * this.option.indentSize);
  },
  makeIndent: function (n) {
    return this.option.indentChar.toString().repeat(n);
  },
};

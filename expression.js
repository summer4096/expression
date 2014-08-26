var SyntaxError = function(name, position){
  this.name = 'SyntaxError';
  this.message = name+' position '+position;
};

var RunError = function(name, position, text){
  this.name = 'RunError';
  this.message = name+' position '+position+' '+text;
};

var types = {};

types.base = function(){};
types.base.type = 'base';
types.base.prototype.priority = 0;
types.base.prototype.init = function(text, options){
  for (var key in options) {
    this[key] = options[key];
  }
};
types.base.prototype.ignore = false;
types.base.prototype.run = false;
types.base.prototype.parents = function(){
  var heritage = [];
  var lastChild = types[this.type];
  while (typeof lastChild.parent != 'undefined') {
    lastChild = lastChild.parent;
    heritage.push(lastChild.type);
  }
  return heritage;
};

types.base._match = function(match, text){
  if (typeof match == 'string') {
    if (text.substr(0, match.length) == match) {
      return [match, {}];
    }
  } else if (match instanceof RegExp) {
    var results = text.match(match);
    if (results) {
      return [results[0], {}]
    }
  } else if (typeof match == 'object') {
    if (Array.isArray(match)) {
      for (var i = 0; i < match.length; i++) {
        var result = types[this.type]._match(match[i], text);
        if (result) {
          return result;
        }
      }
    } else {
      for (var key in match) {
        var result = types[this.type]._match(key, text);
        if (result) {
          result[1] = match[key];
          return result;
        }
      }
    }
  }
  return false;
};

var type = function(name, methods, parent){
  if (!parent) parent = types.base;

  types[name] = function(){
    this.type = name;
    this.init.apply(this, arguments);
  };
  for (var key in parent.prototype) {
    types[name].prototype[key] = parent.prototype[key];
  }
  for (var key in parent) {
    types[name][key] = parent[key];
  }

  types[name].type = name;
  types[name].parent = parent;

  for (var methodName in methods) {
    types[name].prototype[methodName] = methods[methodName];
  }
  return types[name];
}

type('numeric', {
  priority: 2,
  match: /^-?[0-9]*\.?[0-9]+/,
  init: function(text){
    this.value = parseFloat(text);
  },
  add: function(other){
    if (other.type == 'numeric') {
      this.value += other.value;
    } else if (other.type == 'percentage') {
      this.value *= 1+(other.value/100);
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  subtract: function(other){
    if (other.type == 'numeric') {
      this.value -= other.value;
    } else if (other.type == 'percentage') {
      this.value *= 1-(other.value/100);
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  multiply: function(other){
    if (other.type == 'numeric') {
      this.value *= other.value;
    } else if (other.type == 'percentage') {
      this.value *= other.value/100;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  divide: function(other){
    if (other.type == 'numeric') {
      this.value /= other.value;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  exponent: function(other){
    if (other.type == 'numeric') {
      this.value = Math.pow(this.value, other.value);
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  modulus: function(other){
    if (other.type == 'numeric') {
      this.value %= other.value;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  format: function(){
    return this.value;
  }
});

type('percentage', {
  priority: 3,
  match: /^-?[0-9]*\.?[0-9]+%/,
  init: function(text){
    this.value = parseFloat(text.substr(0, text.length-1));
  },
  add: function(other){
    if (other.type == 'percentage') {
      this.value += other.value;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  subtract: function(other){
    if (other.type == 'percentage') {
      this.value -= other.value;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  multiply: function(other){
    if (other.type == 'numeric') {
      this.value *= other.value;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  divide: function(other){
    if (other.type == 'numeric') {
      this.value /= other.value;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  format: function(){
    return this.value+'%';
  }
});

type('comment', {
  priority: -1,
  match: /^[a-zA-Z ]/,
  ignore: true
});

type('unit', {
  priority: 5,
  order: 5,
  power: 1,
  add: function(other){
    if (other.parents().indexOf('unit') != -1) {
      if (this.collection == other.collection) {
        if (this.power == other.power) {
          this.value += other.value;
          this.amount = this.value / this.conversion;
        } else {
          throw 'cannot add different powers';
        }
      } else {
        throw 'cannot add '+this.collection+' to '+other.collection;
      }
    } else if (other.type == 'numeric') {
      this.amount += other.value;
      this.value = this.amount * Math.pow(this.conversion, this.power);
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  subtract: function(other){
    if (other.parents().indexOf('unit') != -1) {
      if (this.collection == other.collection) {
        if (this.power == other.power) {
          this.value -= other.value;
          this.amount = this.value / this.conversion;
        } else {
          throw 'cannot subtract different powers';
        }
      } else {
        throw 'cannot subtract '+other.collection+' from '+this.collection;
      }
    } else if (other.type == 'numeric') {
      this.amount -= other.value;
      this.value = this.amount * Math.pow(this.conversion, this.power);
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  multiply: function(other){
    if (other.parents().indexOf('unit') != -1) {
      if (this.collection == other.collection) {
        this.power += other.power;
        this.amount = (this.value/this.conversion) * (other.value/this.conversion);
        this.value = this.amount * this.conversion;
      } else {
        throw 'cannot multiply '+this.collection+' by '+other.collection;
      }
    } else if (other.type == 'numeric') {
      this.value *= other.value;
      this.amount *= other.value;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  divide: function(other){
    if (other.parents().indexOf('unit') != -1) {
      if (this.collection == other.collection) {
        this.value = (this.value / this.conversion) / (other.value / this.conversion) * this.conversion;
        this.amount = this.value / this.conversion;
        this.power -= other.power;
        if (this.power == 0) {
          this.replace = new types.numeric();
          this.replace.value = this.amount;
        }
      } else {
        throw 'cannot divide '+this.collection+' by '+other.collection;
      }
    } else if (other.type == 'numeric') {
      this.amount /= other.value;
      this.value = this.amount * Math.pow(this.conversion, this.power);
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  exponent: function(other){
    if (other.type == 'numeric') {
      this.power *= other.value;
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  modulus: function(other){
    if (other.type == 'numeric') {
      this.amount %= other.value;
      this.value = this.amount * Math.pow(this.conversion, this.power);
    } else {
      return false;
    }
    other.ignore = true;
    return true;
  },
  convert: function(other){
    if (other.parents().indexOf('unit') != -1) {
      if (this.collection == other.collection) {
        if (this.power == other.power) {
          other.value = this.value;
          other.amount = other.value / other.conversion;
          other.run = false;
        } else {
          throw 'cannot convert between powers';
        }
      } else {
        throw 'cannot convert '+this.collection+' to '+other.collection;
      }
    } else {
      return false;
    }
    this.ignore = true;
    return true;
  },
  terms: {
    singular: 'unit',
    plural: 'units'
  },
  format: function(){
    var powerTerm;
    if (this.terms.powers && this.terms.powers[this.power]) {
      powerTerm = this.terms.powers[this.power];
    } else {
      powerTerm = '$1^'+this.power
    }

    if (this.power == 1) {
      return this.amount+' '+this.terms[(this.amount == 1 ? 'singular' : 'plural')];
    } else {
      return this.amount+' '+powerTerm.split('$1').join(this.terms[(this.amount == 1 ? 'singular' : 'plural')]);
    }
  },
  run: function(before, after){
    if (before.type == 'numeric') {
      this.amount = before.value;
      this.value = this.amount * Math.pow(this.conversion, this.power);
      before.ignore = true;
      this.run = false;
      return true;
    } else {
      return false;
    }
  }
});

type('feet', {
  match: {
    'feet': {},
    'foot': {},
    'ft': {},
    '\'': {},
    'square feet': {power: 2},
    'square foot': {power: 2},
    'sq foot': {power: 2},
    'sq feet': {power: 2},
    'sq ft': {power: 2},
    'sqft': {power: 2}
  },
  conversion: 30.48,
  collection: 'length',
  terms: {
    singular: 'foot',
    plural: 'feet',
    powers: {
      2: 'square $1',
      3: 'cubic $1'
    }
  }
}, types.unit);

type('inches', {
  match: {
    'inches': {},
    'inch': {},
    'in': {},
    '"': {},
    'square inches': {power: 2},
    'square inch': {power: 2},
    'sq inch': {power: 2},
    'sq inches': {power: 2},
    'sq in': {power: 2},
    'sqin': {power: 2}
  },
  conversion: 2.54,
  collection: 'length',
  terms: {
    singular: 'inch',
    plural: 'inches',
    powers: {
      2: 'square $1',
      3: 'cubic $1'
    }
  }
}, types.unit);

type('operator', {
  priority: 1,
  match: {
    '+': {operation: 'add', symmetrical: true, order: 2},
    '-': {operation: 'subtract', order: 2},
    '*': {operation: 'multiply', symmetrical: true, order: 3},
    '/': {operation: 'divide', order: 3},
    '^': {operation: 'exponent', order: 4},
    '%': {operation: 'modulus', order: 3},
    'to': {operation: 'convert', order: 5}
  },
  init: function(text, options){
    types.base.prototype.init.apply(this, arguments);
    this.symbol = text;
  },
  run: function(before, after){
    if (!before[this.operation] || !before[this.operation](after)) {
      if (this.symmetrical) {
        console.log('attempting to run', this.operation, 'backwards on', before, 'and', after);
      }
      if (!this.symmetrical || !after[this.operation] || !after[this.operation](before)) {
        throw this.operation+' not supported';
      }
    }
    this.ignore = true;
    return true;
  },
  format: function(){
    return this.symbol;
  }
});

var orderedTypes = [];
for (var key in types) {
  if (key != 'base') {
    orderedTypes.push(types[key]);
  }
}
orderedTypes.sort(function(a, b){
  return b.prototype.priority - a.prototype.priority;
});

var Expression = function(name, text){
  this.name = name;

  var state = {
    depth: 0
  };

  this.parsed = [];

  var position = 0;
  var err = false;
  while (text.length && !err) {
    var foundMatch = false;
    for (var i in orderedTypes) {
      var match = orderedTypes[i]._match(orderedTypes[i].prototype.match, text);
      if (match) {
        var item = new orderedTypes[i](match[0], match[1]);
        item.position = position;

        position += match[0].length;
        text = text.substr(match[0].length);

        this.parsed.push( item );

        foundMatch = true;
        break;
      }
    }
    if (!foundMatch) {
      err = true;
    }
  }
  if (err) {
    throw new SyntaxError(name, position);
  }
};

Expression.prototype.run = function(parsed){
  if (typeof parsed == 'undefined') {
    parsed = this.parsed;
  }
  parsed = this.parsed.filter(function(item){
    return !item.ignore;
  }).map(function(item){
    return item.replace || item;
  });

  if (parsed.length < 1) return false;
  if (parsed.length == 1) {
    return parsed[0];
  }

  var highestOrder = parsed.filter(function(item){
    return (typeof item.run == 'function');
  }).map(function(item){
    return item.order;
  }).sort().pop();

  for (var i = 0; i < parsed.length; i++) {
    if (parsed[i].order == highestOrder && typeof parsed[i].run == 'function') {
      try {
        if (!parsed[i].run(parsed[i-1], parsed[i+1])) {
          throw 'failed to run';
        }
      } catch (e) {
        if (typeof e == 'string') {
          throw new RunError(this.name, parsed[i].position, e);
        } else {
          throw e;
        }
      }
      break;
    }
  }
  
  return this.run(parsed);
};

module.exports = Expression;
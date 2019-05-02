'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FloatOrNaN = undefined;

var _graphql = require('graphql');

var FloatOrNaN = exports.FloatOrNaN = new _graphql.GraphQLScalarType({
  name: 'FloatOrNaN',
  description: 'Float type that can be "NaN" in addition to null or a real value.',
  serialize: function serialize(value) {
    return isNaN(value) ? 'NaN' : value;
  }
});
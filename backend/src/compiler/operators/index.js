const sourceOperators = require('./sourceOperators');
const mathOperators = require('./mathOperators');
const actionOperators = require('./actionOperators');

module.exports = {
  ...sourceOperators,
  ...mathOperators,
  ...actionOperators
};

var assert = require('assert');

describe('basic', function () {
  this.timeout(60000);
  it('Should create', function (testDone) {
    var event = require('../data/event.json');

    var context = {
      invokeid: 'invokeid',
      done: function (message) {
        testDone();
      },
      succeed: function (message) {
        testDone();
      }
    };

    var lambda = require("../index.js");
    lambda.handler(event, context);
    assert(lambda);
  });
});

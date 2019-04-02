'use strict';

var self = processINs;
module.exports = self;

var handleDependency = require('./handlers/handleDependency.js');

function processINs(externalBag, callback) {
  var bag = {
    stepJSONData: externalBag.stepJSONData,
    stepInDir: externalBag.stepInDir,
    builderApiAdapter: externalBag.builderApiAdapter
  };
  bag.who = util.format('%s|step|%s', msName, self.name);
  logger.info(bag.who, 'Inside');

  async.series([
      _checkInputParams.bind(null, bag),
      _processInSteps.bind(null, bag)
    ],
    function (err) {
      if (err)
        logger.error(bag.who, util.format('Failed to process IN dependencies'));
      else
        logger.info(bag.who, 'Successfully processed IN dependencies');

      return callback(err);
    }
  );
}

function _checkInputParams(bag, next) {
  var who = bag.who + '|' + _checkInputParams.name;
  logger.verbose(who, 'Inside');

  var expectedParams = [
    'stepJSONData',
    'stepInDir',
    'builderApiAdapter'
  ];

  var paramErrors = [];
  _.each(expectedParams,
    function (expectedParam) {
      if (_.isNull(bag[expectedParam]) || _.isUndefined(bag[expectedParam]))
        paramErrors.push(
          util.format('%s: missing param :%s', who, expectedParam)
        );
    }
  );

  var hasErrors = !_.isEmpty(paramErrors);
  if (hasErrors)
    logger.error(paramErrors.join('\n'));

  return next(hasErrors);
}

function _processInSteps(bag, next) {
  var who = bag.who + '|' + _processInSteps.name;
  logger.verbose(who, 'Inside');

  async.eachSeries(bag.stepJSONData.resources,
    function (resource, nextResource) {
      var inDependency = {};
      if (resource.operation === 'IN') {
        inDependency.name = resource.name;
        inDependency.type = global.systemCodesByCode[resource.typeCode].name;
        inDependency.operation = resource.operation;
        inDependency.version = resource.version;
        inDependency.systemPropertyBag = resource.systemPropertyBag;
        inDependency.configPropertyBag = resource.configPropertyBag;
      }

      if (!inDependency) {
        return nextResource();
      }

      async.series([
          handleDependency.bind(null, bag, inDependency),
        ],
        function (err) {
          return nextResource(err);
        }
      );
    },
    function (err) {
      return next(err);
    }
  );
}
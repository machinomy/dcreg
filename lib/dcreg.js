var ship         = require('./ship'),
    registry     = require('./registry'),
    service      = require('./service'),
    bunyan       = require('bunyan'),
               _ = require('lodash');


var Application = function(dockerConnectionParams, consulConnectionParams, loggerParams) {
    this.ship   = ship.build(dockerConnectionParams);
    this.registry = registry.build(consulConnectionParams);
    this.log      = bunyan.createLogger(loggerParams)
};

/**
 * @param {Application} application
 * @param {Function} callback
 */
var eachContainerId = function(application, callback) {
    ship.listContainers(application.ship, function(err, containers) {
        if (err) {
            application.log.fatal(err);
        } else {
            var containerIds = _.map(containers, function(info) {
                return info.Id;
            });
            application.log.info({containerIds: containerIds}, "Read container ids");
            _.each(containerIds, callback);
        }
    });
};

var withNodeName = function(application, callback) {
    registry.withNodeName(application.registry, function(err, nodeName) {
        if (err) {
            application.log.fatal(err);
        } else {
            application.log.info({nodeName: nodeName}, "Read nodeName");
            callback(nodeName);
        }
    });
};

var eachService = function(application, nodeName, containerId, callback) {
    ship.inspectContainer(application.ship, containerId, function(err, containerData) {
        if (err) {
            application.log.fatal(err);
        } else {
            application.log.info({containerId: containerId}, "Inspected container");
            service.eachService(containerData, nodeName, callback);
        }
    });
};

var registerService = function(application, serviceInstance) {
    registry.add(application.registry, serviceInstance, function(err) {
        if (err) {
            application.log.error(err);
        } else {
            application.log.info({service: serviceInstance}, "Registered")
        }
    });
};

var unregisterService = function(application, serviceInstance) {
    registry.remove(application.registry, serviceInstance, function(err) {
        if (err) {
            application.log.error(err);
        } else {
            application.log.info({service: serviceInstance}, "Unregistered")
        }
    });
};

var listenDockerEvents = function(application) {
    application.log.info("Listening for Docker events...")
    ship.listenEvents(application.ship);
};

var onContainerStart = function(application, callback) {
    ship.onContainerStart(application.ship, function(containerId) {
        application.log.info({containerId: containerId}, "Started");
        callback(containerId);
    })
};

var onContainerStop = function(application, callback) {
    ship.onContainerStop(application.ship, function(containerId) {
        application.log.info({containerId: containerId}, "Stopped");
        callback(containerId);
    });
};

var run = function(dockerConnectionParams, consulConnectionParams, loggerParams) {
    var application = new Application(dockerConnectionParams, consulConnectionParams, loggerParams);
    application.log.info("Staring dcreg...");
    withNodeName(application, function(nodeName) {
        eachContainerId(application, function(containerId) {
            eachService(application, nodeName, containerId, function(serviceInstance) {
                registerService(application, serviceInstance)
            });
        });

        onContainerStart(application, function (containerId) {
            eachService(application, nodeName, containerId, function(serviceInstance) {
                registerService(application, serviceInstance);
            });
        });

        onContainerStop(application, function (containerId) {
            eachService(application, nodeName, containerId, function(serviceInstance) {
                unregisterService(application, serviceInstance);
            });
        });

        listenDockerEvents(application);
    });
};

module.exports = {
    run: run
};

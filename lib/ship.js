var Docker       = require('dockerode'),
    DockerEvents = require('docker-events');

var Ship = function(dockerConnectionParams) {
    this.docker = new Docker(dockerConnectionParams);
    this.emitter = new DockerEvents({docker: this.docker});
};

module.exports = {
    build: function(dockerConnectionParams) {
        return new Ship(dockerConnectionParams);
    },
    listContainers: function(ship, callback) {
        ship.docker.listContainers(callback);
    },
    inspectContainer: function(ship, containerId, callback) {
        var dockerContainer = ship.docker.getContainer(containerId);
        dockerContainer.inspect(function(err, containerData) {
            if (err) {
                callback(err)
            } else {
                callback(null, containerData)
            }
        });
    },
    onContainerStart: function(ship, callback) {
        ship.emitter.on('start', function(message) {
            var containerId = message.id;
            callback(containerId);
        });
    },
    onContainerStop: function(ship, callback) {
        ship.emitter.on("die", function(message) {
            var containerId = message.id;
            callback(containerId);
        });
    },
    listenEvents: function(ship) {
        ship.emitter.start();
    }
};

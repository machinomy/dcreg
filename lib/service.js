var _ = require('lodash');

var STANZA = /^DCREG_ATTRS=/;

var Service = function(name, port, containerId, nodeName) {
    this.name = name;
    this.port = port;
    this.containerId = containerId;
    this.nodeName = nodeName;
};

var build = function (name, port, containerId, nodeName) {
    return new Service(name, port, containerId, nodeName)
};

var externalPort = function(containerData, internalPort) {
    var portBindings = containerData.HostConfig.PortBindings;
    var binding = _.first(portBindings[internalPort]);
    var port = binding.HostPort;
    return parseInt(port);
};

var eachService = function (containerData, nodeName, callback) {
    var env = containerData.Config.Env;
    var found = _.find(env, function(line) {
        return line.match(STANZA);
    });
    if (found) {
        var servicePortMapping = JSON.parse(found.replace(STANZA, ''));
        _.each(servicePortMapping, function(internalPort, serviceName) {
            var name = containerData.Config.Image.replace(/[\/:\.]/g, '-') + '-' + serviceName;
            var containerId = containerData.Id;
            var service = build(name, externalPort(containerData, internalPort), containerId, nodeName);
            callback(service);
        });
    }
};

module.exports = {
    eachService: eachService
};

var Consul       = require('consul');

var KV_PREFIX = 'dcreg';

var Registry = function(consulConnectionParams) {
    this.consul = new Consul(consulConnectionParams);
};

var containerKey = function(service) {
    return KV_PREFIX + '/' + service.nodeName + '/' + service.containerId;
};

module.exports = {
    build: function(consulConnectionParams) {
        return new Registry(consulConnectionParams);
    },
    withNodeName: function(registry, callback) {
        registry.consul.agent.self(function(err, agent) {
            if (err) {
                callback(err);
            } else {
                var nodeName = agent.Config.NodeName;
                callback(null, nodeName);
            }
        });
    },
    add: function(registry, service, callback) {
        var serviceParams = {
            name: service.name,
            id: service.name,
            tags: ['dcreg'],
            port: service.port
        };
        registry.consul.agent.service.register(serviceParams, function(err) {
            if (err) {
                callback(err)
            } else {
                var key = containerKey(service)
                registry.consul.kv.set(key, service.name, function(err, result) {
                    if (err) {
                        callback(err)
                    } else {
                        callback(null, result)
                    }
                });
            }
        });
    },
    remove: function(registry, service, callback) {
        var serviceId = service.name;
        registry.consul.agent.service.deregister(serviceId, function(err) {
           if (err) {
               callback(err);
           } else {
               registry.consul.kv.del(containerKey(service), callback);
           }
        });
    }
};

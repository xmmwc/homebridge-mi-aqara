const DeviceParser = require('./DeviceParser');
const AccessoryParser = require('./AccessoryParser');

class SingleSwitchD1LNParser extends DeviceParser {
    constructor(platform) {
        super(platform);
    }
    
    getAccessoriesParserInfo() {
        return {
            'SingleSwitchD1LN_Switch': SingleSwitchD1LNSwitchParser
        }
    }
}
SingleSwitchD1LNParser.modelName = ['switch', 'switch.b1nacn02'];
module.exports = SingleSwitchD1LNParser;

class SingleSwitchD1LNSwitchParser extends AccessoryParser {
    constructor(platform, accessoryType) {
        super(platform, accessoryType)
    }
    
    getAccessoryCategory(deviceSid) {
        var serviceType = this.platform.ConfigUtil.getAccessoryServiceType(deviceSid, this.accessoryType);
        if(serviceType == 'Lightbulb') {
            return this.Accessory.Categories.LIGHTBULB;
        } else {
            return this.Accessory.Categories.SWITCH;
        }
    }
    
    getAccessoryInformation(deviceSid) {
        return {
            'Manufacturer': 'Aqara',
            'Model': 'Single Switch D1 LN',
            'SerialNumber': deviceSid
        };
    }

    getServices(jsonObj, accessoryName) {
        var that = this;
        var result = [];
        
        var service = null;
        var deviceSid = jsonObj['sid'];
        var serviceType = that.platform.ConfigUtil.getAccessoryServiceType(deviceSid, that.accessoryType);
        if(serviceType == 'Lightbulb') {
            service = new that.Service.Lightbulb(accessoryName);
        } else {
            service = new that.Service.Switch(accessoryName);
        }
        service.getCharacteristic(that.Characteristic.On);
        result.push(service);
        
        return result;
    }
    
    parserAccessories(jsonObj) {
        var that = this;
        var deviceSid = jsonObj['sid'];
        var uuid = that.getAccessoryUUID(deviceSid);
        var accessory = that.platform.AccessoryUtil.getByUUID(uuid);
        if(accessory) {
            var service = null;
            var serviceType = that.platform.ConfigUtil.getAccessoryServiceType(deviceSid, that.accessoryType);
            if(serviceType == 'Lightbulb') {
                service = accessory.getService(that.Service.Lightbulb);
            } else {
                service = accessory.getService(that.Service.Switch);
            }
            var onCharacteristic = service.getCharacteristic(that.Characteristic.On);
            var value = that.getOnCharacteristicValue(jsonObj, null);
            if(null != value) {
                onCharacteristic.updateValue(value);
            }
            
            if(that.platform.ConfigUtil.getAccessorySyncValue(deviceSid, that.accessoryType)) {
                if (onCharacteristic.listeners('get').length == 0) {
                    onCharacteristic.on("get", function(callback) {
                        var command = '{"cmd":"read", "sid":"' + deviceSid + '"}';
                        that.platform.sendReadCommand(deviceSid, command).then(result => {
                            var value = that.getOnCharacteristicValue(result, null);
                            if(null != value) {
                                callback(null, value);
                            } else {
                                callback(new Error('get value fail: ' + result));
                            }
                        }).catch(function(err) {
                            that.platform.log.error(err);
                            callback(err);
                        });
                    });
                }
            }
            
            if(onCharacteristic.listeners('set').length == 0) {
                onCharacteristic.on("set", function(value, callback) {
                    var model = that.platform.getDeviceModelBySid(deviceSid);
                    var command = null;
                    var proto_version_prefix = that.platform.getProtoVersionPrefixByProtoVersion(that.platform.getDeviceProtoVersionBySid(deviceSid));
                    if(1 == proto_version_prefix) {
                        command = '{"cmd":"write","model":"' + model + '","sid":"' + deviceSid + '","data":{"channel_0":"' + (value ? 'on' : 'off') + '", "key": "${key}"}}';
                    } else if(2 == proto_version_prefix) {
                        command = '{"cmd":"write","model":"' + model + '","sid":"' + deviceSid + '","params":[{"channel_0":"' + (value ? 'on' : 'off') + '"}], "key": "${key}"}';
                    } else {
                    }
                    
                    if(that.platform.ConfigUtil.getAccessoryIgnoreWriteResult(deviceSid, that.accessoryType)) {
                        that.platform.sendWriteCommandWithoutFeedback(deviceSid, command);
                        that.callback2HB(deviceSid, this, callback, null);
                    } else {
                        that.platform.sendWriteCommand(deviceSid, command).then(result => {
                            that.callback2HB(deviceSid, this, callback, null);
                        }).catch(function(err) {
                            that.platform.log.error(err);
                            that.callback2HB(deviceSid, this, callback, err);
                        });
                    }
                });
            }
        }
    }
    
    getOnCharacteristicValue(jsonObj, defaultValue) {
        var value = this.getValueFrJsonObjData(jsonObj, 'channel_0');
        if(value === 'on') {
            return true;
        } else if(value === 'off') {
            return false;
        } else {
            return defaultValue;
        }
    }
}

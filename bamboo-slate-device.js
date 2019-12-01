const REGISTRATION_ID = new Uint8Array([0xF5, 0x4B, 0x3B, 0x93, 0xC, 0x88]);
const NORDIC_UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_CHRC_TX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_CHRC_RX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const WACOM_LIVE_SERVICE_UUID = "00001523-1212-efde-1523-785feabcd123";
const WACOM_CHRC_LIVE_PEN_DATA_UUID = "00001524-1212-efde-1523-785feabcd123";
const WACOM_OFFLINE_SERVICE_UUID = "ffee0001-bbaa-9988-7766-554433221100";
const WACOM_OFFLINE_CHRC_PEN_DATA_UUID = "ffee0003-bbaa-9988-7766-554433221100";
const CHUNKSIZE = 16;

export class BambooSlateDevice {

    constructor() {
        this.connected = false;
        this.device = null;
        this.uart = null;
        this.server = null;
        this.tx = null;
        this.rx = null;
        this.uuid = [];

        this.onDisconnected = this.onDisconnected.bind(this);
        this.onConnected = Function.prototype;
        this.onError = this.onError.bind(this);
        this.onPenData = this.onPenData.bind(this);
        this.onDraw = Function.prototype;
    }

    /**
     * Open the in-browser Bluetooth device selector. Must be called as part of user interaction (e.g. double-click).
     */
    selectDevice() {
        var bamboo = this;

        return navigator.bluetooth.requestDevice({
            "filters": [{
                "name": "Bamboo Slate"
            }],
            "optionalServices": [NORDIC_UART_SERVICE_UUID, WACOM_LIVE_SERVICE_UUID]
        }).then(function (device) {
            bamboo.device = device;
            bamboo.connect();
        });
    }

    /**
     * Connect to the Bamboo Slate device.
     */
    connect() {
        var bamboo = this;

        // Listen for disconnect and start GATT connection

        this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

        return this.device.gatt.connect().then(function (server) {

            bamboo.server = server;

            // Get UART service
            return server.getPrimaryService(NORDIC_UART_SERVICE_UUID);

        }).then(function (service) {

            // Get RX characteristic
            bamboo.uart = service;
            return bamboo.uart.getCharacteristic(NORDIC_UART_CHRC_RX_UUID);

        }).then(function (characteristic) {

            // Add event listener to RX
            bamboo.rx = characteristic;
            bamboo.rx.addEventListener('characteristicvaluechanged', function (event) {
                var value = event.target.value.buffer;
            });
            return bamboo.rx.startNotifications();

        }).then(function () {

            // Get TX characteristic
            return bamboo.uart.getCharacteristic(NORDIC_UART_CHRC_TX_UUID);

        }).then(function (characteristic) {

            // Store characteristic
            bamboo.tx = characteristic;

            // Get LIVE service
            return bamboo.server.getPrimaryService(WACOM_LIVE_SERVICE_UUID);

        }).then(function (service) {

            // Get TX characteristic
            return service.getCharacteristic(WACOM_CHRC_LIVE_PEN_DATA_UUID);

        }).then(function (characteristic) {

            // Add event listener to RX
            bamboo.live = characteristic;
            bamboo.live.addEventListener('characteristicvaluechanged', bamboo.onPenData);
            return bamboo.live.startNotifications();

        }).then(function () {

            // Connected
            bamboo.connected = true;
            bamboo.onConnected();
            bamboo.startLive();

        }).catch(function (err) {

            // Fatal error
            bamboo.onError(err);

        });
    }

    /**
     * Execute an operation on the Bamboo Slate.
     * @param {number} opcode Operation code.
     * @param {Array} args Payload array.
     */
    exec(opcode, args = [0x00]) {
        var bamboo = this;

        // Create packet
        var packet = new Uint8Array([opcode, args.length].concat(args));

        // Create promise for response and add event listener
        var promise = new Promise(function (resolve, reject) {
            bamboo.rx.addEventListener("characteristicvaluechanged", function (event) {
                var response = new Uint8Array(event.target.value.buffer);

                resolve({
                    opcode: response[0],
                    args: response.slice(2)
                });
            }, {
                once: true
            });
        });

        this.tx.writeValue(packet.buffer);

        return promise;

    }

    /**
     * Register with the device.
     */
    register() {
        this.exec(0xE7, this.uuid);
    }

    /**
     * Turn the device into "live-mode". This initiates the streaming of pen data.
     */
    startLive() {
        var self = this;

        return this.checkConnection().then(() => {
            self.exec(0xb1);
        });
    }

    /**
     * Check the connection with the device.
     * @returns {boolean} Connection is ok.
     */
    checkConnection() {
        return this.exec(0xe6, [0xF5, 0x4B, 0x32, 0x92, 0xC, 0x88]);
    }

    /**
     * Break connection with device.
     */
    disconnect() {
        if (!this.device) {
            return Promise.reject('Device is not connected.');
        }
        return this.device.gatt.disconnect();
    }

    /**
     * Called if the connection is lost. Will attempt to reconnect.
     */
    onDisconnected() {
        this.connect();
    }

    /**
     * Called if there is an error during the connection sequence.
     * @param {Error} err 
     */
    onError(err) {
        console.error(err);
    }

    /**
     * Called when pen data is recieved from the device. Event value contains a buffer that must be decoded.
     * @param {*} event 
     */
    onPenData(event) {
        var buffer = event.target.value.buffer;
        var dv = new DataView(buffer, 0);

        if (dv.getUint8(0) == 0xa1) {
            for (var i = 2; i + 6 < dv.byteLength; i += 6) {
                var z = dv.getInt16(i + 4, true);
                var point = [dv.getInt16(i, true), dv.getInt16(i + 2, true), z, 0, Math.random()]; // [x, y, pressure, is_new_stroke, random]
                if (z > 0) {
                    if (this.lastPoint[2] == 0) point[3] = 1;
                    this.onDraw(point[0], point[1], point[2], point[3]);
                }
                this.lastPoint = point;
            }
        }
    }

}
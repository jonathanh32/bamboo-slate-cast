const REGISTRATION_ID = new Uint8Array([0xF5, 0x4B, 0x3B, 0x93, 0xC, 0x88]);
const NORDIC_UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_CHRC_TX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NORDIC_UART_CHRC_RX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const WACOM_LIVE_SERVICE_UUID = "00001523-1212-efde-1523-785feabcd123";
const WACOM_CHRC_LIVE_PEN_DATA_UUID = "00001524-1212-efde-1523-785feabcd123";
const WACOM_OFFLINE_SERVICE_UUID = "ffee0001-bbaa-9988-7766-554433221100";
const WACOM_OFFLINE_CHRC_PEN_DATA_UUID = "ffee0003-bbaa-9988-7766-554433221100";
const CHUNKSIZE = 16;

class BambooSlate {

    constructor(canvas_id) {
        this.connected = false;
        this.device = null;
        this.uart = null;
        this.server = null;
        this.tx = null;
        this.rx = null;
        this.uuid = [];
        this.canvas = document.getElementById(canvas_id);
        this.ctx = this.canvas.getContext("2d");
        this.points = [];
        this.lastPoint = [0,0,0,0];

        this.onDisconnected = this.onDisconnected.bind(this);
        this.onConnected = this.onConnected.bind(this);
        this.onError = this.onError.bind(this);
        this.onPenData = this.onPenData.bind(this);

        var self = this;

        this.canvas.addEventListener('dblclick', event => {
            if(!self.connected) {
                self.select_device();
            } else {
                if(confirm("Are you sure you want to clear the canvas?")) {
                    self.points = [];
                    self.draw();
                }
            }
        });

        function resize() {
            var maxHeight = window.innerHeight - 100;
            var maxWidth = window.innerWidth - 100;

            canvas.height = Math.min(maxHeight, maxWidth / 1.46);
            canvas.width = Math.min(maxHeight * 1.46, maxWidth);
            
            self.draw();
        }

        resize();

        window.onresize = resize;
    }

    select_device() {
        var bamboo = this;

        return navigator.bluetooth.requestDevice({
            "filters": [{
                "name": "Bamboo Slate"
            }],
            "optionalServices": [NORDIC_UART_SERVICE_UUID, WACOM_LIVE_SERVICE_UUID]
        }).then(function(device){
            bamboo.device = device;
            bamboo.connect();
        });
    }

    connect(device) {
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
            bamboo.onConnected();
            bamboo.start_live();

        }).catch(function (err) {

            // Fatal error
            bamboo.onError(err);

        });
    }

    exec(opcode, args = [0x00], opt) {
        var bamboo = this;
        
        // Create packet
        var packet = new Uint8Array([opcode, args.length].concat(args));
        
        // Create promise for response and add event listener
        var promise = new Promise(function(resolve, reject) {
            bamboo.rx.addEventListener("characteristicvaluechanged", function(event){
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

    register() {
        // Start
        this.exec(0xE7, this.uuid);

        // Finish
        // this.exec(0xE5);

        // bambooSlate.exec(0xb6, [169, 124, 249, 91, 0, 0]) // set time
        // bambooSlate.exec(0xD6) // get time
        // bambooSlate.exec(0xec, [0x06, 0x00, 0x00, 0x00, 0x00, 0x00]) // ec
        // bambooSlate.exec(0xdb) // get name
        // bambooSlate.exec(0xc1) // is data available?
    }

    start_live() {
        var self = this;

        return this.check_connection().then(() => {
            self.exec(0xb1);
        });
    }

    check_connection() {
        return this.exec(0xe6, [0xF5, 0x4B, 0x32, 0x92, 0xC, 0x88]);
    }

    disconnect() {
        if (!this.device) {
            return Promise.reject('Device is not connected.');
        }
        return this.device.gatt.disconnect();
    }

    onConnected() {
        this.connected = true;
        this.draw();
    }

    onDisconnected() {
        this.connect();
    }

    onError(err) {
        console.error(err);
    }

    onPenData(event) {
        var buffer = event.target.value.buffer;
        var dv = new DataView(buffer, 0);

        if(dv.getUint8(0) == 0xa1) {
            for(var i=2; i+6<dv.byteLength; i+=6) {
                var z = dv.getInt16(i + 4, true);
                var point = [dv.getInt16(i, true), dv.getInt16(i + 2, true), z, 0, Math.random()]; // [x, y, pressure, is_new_stroke, random]
                if(z > 0) {
                    if(this.lastPoint[2] == 0) point[3] = 1;
                    this.points.push(point);
                }
                this.lastPoint = point;
            }
        }

        if(this.points.length > 0) this.draw();
    }

    draw() {
        var ctx = this.ctx;
        this.ctx.font = "20px Arial"; 
        this.ctx.textAlign = "center"; 
        this.ctx.lineJoin = "round";
        this.ctx.lineCap = "round";
        this.ctx.lineWidth = 1;

        this.ctx.fillStyle = "white";
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if(this.points.length == 0) {

            this.ctx.fillStyle = "black";
            if(!this.connected) ctx.fillText("Double-click to start", canvas.width / 2, canvas.height / 2);
            else ctx.fillText("Ready", canvas.width / 2, canvas.height / 2);

        } else {
            
            var sx = ctx.canvas.width / 21600;
            var sy = ctx.canvas.height / 14800;

            for (var i = 0; i < this.points.length; i++) {
                
                var p = this.points[i];

                if(p[3] == 1) {
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(sx * p[0], sy * p[1]);
                }

                ctx.lineTo(sx * p[0], sy * p[1]);

            }

            ctx.stroke();

        }
        
    }

}

var bambooSlate = new BambooSlate("canvas");
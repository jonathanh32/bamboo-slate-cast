import { BambooSlateDevice } from "/bamboo-slate-device.js";

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
        this.bamboo = new BambooSlateDevice();
        this.bamboo.onDraw = this.onDraw.bind(this);
        this.bamboo.onConnected = this.onConnected.bind(this);

        this.canvas = document.getElementById(canvas_id);
        this.ctx = this.canvas.getContext("2d");
        this.points = [];
        this.lastPoint = [0,0,0,0];

        var self = this;

        this.canvas.addEventListener('dblclick', event => {
            if(!self.connected) {
                self.bamboo.select_device();
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

    onConnected() {
        this.connected = true;
        this.draw();
    }

    onDraw(x, y, z, is_new_stroke) {
        this.points.push([x, y, z, is_new_stroke]);
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
import { BambooSlateDevice } from "/bamboo-slate-device.js";
import { DrawingCanvas } from "/drawing-canvas.js";

let bamboo = new BambooSlateDevice();
let canvasEl = document.getElementById("canvas");
let drawingCanvas = new DrawingCanvas(canvasEl);

drawingCanvas.setPlaceholderText("Double-click to start");

bamboo.onDraw = drawingCanvas.addStroke.bind(drawingCanvas);
bamboo.onConnected = function(){
    drawingCanvas.setPlaceholderText("Ready");
};

canvasEl.addEventListener('dblclick', event => {
    if(!bamboo.connected) {
        bamboo.selectDevice();
    } else {
        if(confirm("Are you sure you want to clear the canvas?")) {
            drawingCanvas.clear();
        }
    }
});

window.onresize = function(){
    var maxHeight = window.innerHeight - 100;
    var maxWidth = window.innerWidth - 100;
    drawingCanvas.resize(maxHeight, maxWidth);
};
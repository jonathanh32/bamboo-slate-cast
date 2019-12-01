import { BambooSlateDevice } from "/bamboo-slate-device.js";
import { DrawingCanvas } from "/drawing-canvas.js";

let bamboo = new BambooSlateDevice();
let containerEl = document.getElementById("container");
let canvasEl = document.getElementById("canvas");
let drawingCanvas = new DrawingCanvas(canvasEl);

bamboo.onDraw = drawingCanvas.addStroke.bind(drawingCanvas);

document.getElementById('connect').addEventListener('click', function(event){
    bamboo.selectDevice();
});

bamboo.onConnected = function(){
    document.getElementById('intro').style.display = 'none';
};

canvasEl.addEventListener('dblclick', event => {
    if(confirm("Are you sure you want to clear the canvas?")) {
        drawingCanvas.clear();
    }
});

function updateScale(){
    var maxHeight = window.innerHeight - 100;
    var maxWidth = window.innerWidth - 100;
    drawingCanvas.resize(maxHeight, maxWidth);
}

updateScale();

window.onresize = updateScale;
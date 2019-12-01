export class DrawingCanvas {

    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext("2d");
        this.points = [];
        this.lastPoint = [0,0,0,0];
        this.placeholderText = "";
    }

    /**
     * Change the size of the canvas element.
     * @param {number} maxHeight 
     * @param {number} maxWidth 
     */
    resize(maxHeight, maxWidth) {
        canvas.height = Math.min(maxHeight, maxWidth / 1.46);
        canvas.width = Math.min(maxHeight * 1.46, maxWidth);
        this.draw();
    }

    /**
     * Clear all strokes on the canvas and redraw.
     */
    clear() {
        this.points = [];
        this.draw();
    }

    /**
     * Add a stroke to the canvas.
     * @param {number} x 
     * @param {number} y 
     * @param {number} z Pressure of stroke.
     * @param {boolean} is_new_stroke Do not join to previous stroke, but start a new one.
     */
    addStroke(x, y, z, is_new_stroke) {
        this.points.push([x, y, z, is_new_stroke]);
        if(this.points.length > 0) this.draw();
    }

    /**
     * Placeholder text to be displayed if the canvas is clear.
     * @param {string} placeholderText 
     */
    setPlaceholderText(placeholderText) {
        this.placeholderText = placeholderText;
        this.draw();
    }

    /**
     * Render the points on the canvas. If no points are added then render the placeholder text.
     */
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
            ctx.fillText(this.placeholderText, canvas.width / 2, canvas.height / 2);

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
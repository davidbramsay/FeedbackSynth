//GLOBAL CONSTANTS
MAXGAINSTART = 40;
SAMPLERATE = 44100;
SPECTPOINTS = 100;
NUMEQNODES = 9;
//CanvasWidth, CanvasHeight (defined in onload) 
MAXGAIN = 40; 
recalcFlag = false;
eqPoints = [];
eqNodes = [];
bwScaleFactor=1; //pixel width corresponding to one octave (set up on page load)
gainNode = [];


window.requestAnimationFrame = (function(){
return window.requestAnimationFrame  ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame    ||
  window.oRequestAnimationFrame      ||
  window.msRequestAnimationFrame     ||
  function(callback){ 
  window.setTimeout(callback, 1000 / 60);
};
})();


function eqObject (x,y) {
  this.x = x;
  this.y = y;
  this.freq = freqFromX(x) || 0;
  this.gain = gainFromY(y) || 0;
  this.q = 5;
}



function gainFromY (y)    {return ((y/CanvasHeight)*(-2*MAXGAIN)) + MAXGAIN;} //return gain in dB
function yFromGain (gain) {return ((gain - MAXGAIN)/(-2*MAXGAIN)) * CanvasHeight;} //return gain in dB
function xFromFreq (freq) {return (CanvasWidth / (Math.log(SAMPLERATE/40.0)/Math.LN10)) * (Math.log(freq/20.0)/Math.LN10);}
function freqFromX (x)    { //return freq at x
  var freq;
    if(x>0){ freq = 20* Math.pow(SAMPLERATE/40,x/CanvasWidth);}
    else{freq=20;}
  return freq;
}

function BWfromQ(Q){
  return Math.log(((2*Q*Q+1)/(2*Q*Q))+Math.sqrt((Math.pow((2*Q*Q+1)/(Q*Q),2)/4)-1))/Math.log(2);
}

//main draw function, which is called repeatedly by animation frame
function drawCanvas() {
  var drawContext = document.getElementById('canvas').getContext('2d');
  drawSpectrogram(drawContext);
  drawEQ(drawContext);
  requestAnimationFrame(drawCanvas);

}

//interpolate EQ and save in eqPoints
function interpolateEQ(numPoints){

  for(var i=0;i<numPoints;i++){
  
    var x = i*CanvasWidth/(numPoints-1); 
    var magnitude = 0.0;

    for (ind in eqNodes){
      magnitude = magnitude + eqNodes[ind].gain*Math.exp((-1*(x-eqNodes[ind].x)*(x-eqNodes[ind].x))/(2*Math.pow(BWfromQ(eqNodes[ind].q)*bwScaleFactor*3,2)));
    }
    if (isNaN(magnitude)){magnitude = 0;}

    eqPoints[i]=({'x':x,'y':yFromGain(magnitude)});
  }

}

//draw the EQ points and line
function drawEQ(drawContext) {
  var NodeDim = 5;

  //draw line
  if (recalcFlag){
    interpolateEQ(1000);
  }

  drawContext.beginPath();
  drawContext.moveTo(eqPoints[0].x, eqPoints[0].y);

  for (i = 1; i < eqPoints.length - 2; i ++) {
    var xc = (eqPoints[i].x + eqPoints[i+1].x) / 2;
    var yc = (eqPoints[i].y + eqPoints[i+1].y) / 2;
    drawContext.quadraticCurveTo(eqPoints[i].x, eqPoints[i].y, xc, yc);
  }
 
  drawContext.quadraticCurveTo(eqPoints[i].x, eqPoints[i].y, eqPoints[i+1].x, eqPoints[i+1].y);
  drawContext.lineWidth = 5;
  drawContext.strokeStyle = "#172457";
  drawContext.stroke();

  drawContext.lineWidth = 1;
  drawContext.strokeStyle = "#FFE1AD";
  drawContext.stroke();

  drawContext.closePath();


  //draw nodes
  drawContext.strokeStyle = "#172457";
  drawContext.fillStyle = "#FFE1AD";
  drawContext.lineWidth = 5;

  for (ind in eqNodes){
      drawContext.beginPath();
      drawContext.arc(eqNodes[ind].x, eqNodes[ind].y, NodeDim, 0, 2 * Math.PI, false);
      drawContext.fill();
      drawContext.stroke();
      drawContext.closePath();
    }

}

//draw the spectrogram
function  drawSpectrogram(drawContext){
 
  var freqDomain = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqDomain);
  

  //pull input frequencies based on sample rate and frame size of freqDomain
  //change freqDomain from linear to log 20log10 of input value (scaled from 1 to 2), which gives 0-6 dB
  // then scaled to height of canvas

  var inputFreq = [];
  var outputVal = [];
  for (var i in freqDomain) {
    inputFreq[i] = ((i*SAMPLERATE/2.0)/(freqDomain.length-1));
    outputVal[i] = 20 * (Math.log(freqDomain[i]/256.0 + 1)/Math.log(10)) * (CanvasHeight/6.0); 
  }

  inputFreq.shift(); //cut off DC value
  outputVal.shift();

  //map input frequencies to log scale over 0-(width of pixels in frame), where 0=20hz and width=Nyquist
  var outputPixel = [];
  for (var i in inputFreq){
    outputPixel[i] = xFromFreq(inputFreq[i]);
  }

  //initialze bins for visualization
  var breakPoints = [];

  for (var i=0; i < SPECTPOINTS; i++) {
    breakPoints[i] = i*(CanvasWidth)/SPECTPOINTS;
  }
  //step through and energy average all values in a linear bin area of the log scaled pixel dimension
  var binVal=Array.apply(null, new Array(SPECTPOINTS)).map(Number.prototype.valueOf,0);
  var binNum = Array.apply(null, new Array(SPECTPOINTS)).map(Number.prototype.valueOf,0);
  var n = 0;

  for (var i in outputPixel){
      if (outputPixel[i] < (breakPoints[n] + CanvasWidth/SPECTPOINTS) && outputPixel[i] > breakPoints[n]){
        
        binVal[n] = binVal[n] + outputVal[i];
        binNum[n] = binNum[n] + 1.0;
        //console.log('outputPixel=' + outputPixel[i] + ' breakPoint=' + breakPoints[n]);

      } else if (outputPixel[i] > (breakPoints[n] + CanvasWidth/SPECTPOINTS)) {
      
        while (outputPixel[i] > (breakPoints[n] + CanvasWidth/SPECTPOINTS)){
        
          if (binNum[n]){
            binVal[n] = binVal[n]/binNum[n];
          }else if (n>0) {
            binVal[n] = binVal[n-1];
          } else{
            binVal[n] = 0;
          }

          n = n + 1;
        }

        binVal[n] = binVal[n] + outputVal[i];
        binNum[n] = binNum[n] + 1;
      
      }
  }

  if (binNum[n]){
    binVal[n] = binVal[n]/binNum[n];
  }else {
    binVal[n] = 0;
  }
     
  //DRAW SPECTROGRAM
  drawContext.clearRect ( 0 , 0 , CanvasWidth, CanvasHeight );
  
  drawContext.beginPath();
  drawContext.moveTo(breakPoints[0]+CanvasWidth/SPECTPOINTS, CanvasHeight-binVal[0]);

  for (i = 1; i < breakPoints.length - 2; i ++) {
    var xc = (breakPoints[i]+CanvasWidth/SPECTPOINTS + breakPoints[i + 1]+CanvasWidth/SPECTPOINTS) / 2;
    var yc = (CanvasHeight-binVal[i] + CanvasHeight-binVal[i+1]) / 2;
    drawContext.quadraticCurveTo(breakPoints[i]+CanvasWidth/SPECTPOINTS, CanvasHeight-binVal[i], xc, yc);
  }
 
  drawContext.quadraticCurveTo(breakPoints[i]+CanvasWidth/SPECTPOINTS, CanvasHeight-binVal[i], breakPoints[i + 1]+CanvasWidth/SPECTPOINTS,CanvasHeight-binVal[i+1]);
  drawContext.lineTo(CanvasWidth,CanvasHeight);
  drawContext.lineTo(0,CanvasHeight);
  drawContext.lineTo(breakPoints[0]+CanvasWidth/SPECTPOINTS, CanvasHeight-binVal[0]);
  drawContext.lineCanvasWidth = 3;

  var grd = drawContext.createLinearGradient(0, 0, 0, CanvasHeight);
  grd.addColorStop(0, '#594f52');   
  grd.addColorStop(1, '#FFB433');
  drawContext.fillStyle = grd;

  drawContext.strokeStyle = "#FFE1AD";
  drawContext.stroke();
  drawContext.fill(); 
  drawContext.closePath();
}

function findClickSelection(x,y){
  //return index of selected on mouseclick, -1 if none selected
  
  function isCircleClicked(x, y, xcenter, ycenter, radius) {
    //return true/false if circle is clicked

    var dx = Math.abs(x-xcenter);
    var dy = Math.abs(y-ycenter);
    
    if (dx > radius) { 
        return false;
    }else if (dy > radius) {
        return false;
    }else if (dx <= radius && dy <= radius){ 
        return true;
    }else  if (dx*dx + dy*dy <= radius*radius){ 
        return true;
    }else { 
        return false;
    }
  }

  for (ind in eqNodes){
    if(isCircleClicked(x, y, eqNodes[ind].x, eqNodes[ind].y, 15)){
      return ind;
    }
  }
  return (-1);
}

initializeEQ = function() {
  
  for (var i =0; i < NUMEQNODES; i++){
    var temp = new eqObject(i*CanvasWidth/NUMEQNODES + (CanvasWidth/NUMEQNODES)/2, CanvasHeight/2);
    eqNodes.push(temp);
  }


  var selected = -1;

  $('#canvasWrap').mousedown(function(e){
      recalcFlag = true;
      var offset = $(this).offset();
      console.log('mousedown at x:' + (e.pageX - offset.left) + ' y:' + (e.pageY - offset.top));

      selected = findClickSelection((e.pageX - offset.left),(e.pageY - offset.top));
      console.log('selected:' + selected);
  });

  $(document).mouseup(function(){
      recalcFlag = false;
      selected = -1;
      console.log('release');
  });

  $('#canvasWrap').mousemove(function(e){
      if(recalcFlag == false) return;
      var offset = $(this).offset();
      if(selected != -1){
        
        if(e.shiftKey){
         
          eqNodes[selected].q = (39-(e.pageY - offset.top)/CanvasHeight * 39) +1
          eqObject[selected].Q.value = eqNodes[selected].q;
          console.log(eqNodes[selected].q);

        } else{
          eqNodes[selected].x = (e.pageX - offset.left);
          eqNodes[selected].y = (e.pageY - offset.top);
          eqNodes[selected].freq = freqFromX(eqNodes[selected].x);
          eqNodes[selected].gain = gainFromY(eqNodes[selected].y);
          eqObject[selected].frequency.value = eqNodes[selected].freq;
          eqObject[selected].gain.value = eqNodes[selected].gain;
          console.log('freq:' + freqFromX(e.pageX - offset.left));
          console.log('gain:' + gainFromY(e.pageY - offset.top));
        }
      }
  });


}


//handle canvas redraw on resize
window.onresize = function(event) {


  rescaleEqNodes = function(){
    for (ind in eqNodes){
      eqNodes[ind].x = xFromFreq(eqNodes[ind].freq);
    }
  }


  document.getElementById('canvas').width = Math.round((window.innerWidth-100)*.76);
  CanvasWidth = document.getElementById('canvas').width;

  rescaleEqNodes();

  for(ind in eqNodes){
    console.log(eqNodes[ind].x + " : " + eqNodes[ind].freq);
  }

  bwScaleFactor = xFromFreq(40);
  interpolateEQ(1000);
  

};


/*
initializeKnobs = function(){

    $(".knob").each(function (e) {
    $(this).knob({


            draw : function () {

                if (event.target.id == "delayKnob"){
                  if (typeof delay.delayTime !== 'undefined'){
                    delay.delayTime.value = this.cv/50;
                  }
                } else if (event.target.id == "gainKnob"){
                    gainNode.gain.value = this.cv/9 + 1;
                } else if (event.target.id == "eqKnob"){
                  MAXGAIN = MAXGAINSTART * (2*(this.cv/100) + 1);
                  for(ind in eqNodes){
                    eqNodes[ind].gain = gainFromY(eqNodes[ind].y);
                    eqObject[ind].gain.value = eqNodes[ind].gain;
                  }


                }
                



                console.log(event.target.id + ' ' + this.cv);

                if(this.$.data('skin') == 'tron') {
                    this.cursorExt = 0.3;
                    var a = this.arc(this.cv)  // Arc
                        , pa                   // Previous arc
                        , r = 1;
                    this.g.lineWidth = this.lineWidth;
                    if (this.o.displayPrevious) {
                        pa = this.arc(this.v);
                        this.g.beginPath();
                        this.g.strokeStyle = this.pColor;
                        this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, pa.s, pa.e, pa.d);
                        this.g.stroke();
                    }
                    this.g.beginPath();
                    this.g.strokeStyle = r ? this.o.fgColor : this.fgColor ;
                    this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, a.s, a.e, a.d);
                    this.g.stroke();
                    this.g.lineWidth = 2;
                    this.g.beginPath();
                    this.g.strokeStyle = this.o.fgColor;
                    this.g.arc( this.xy, this.xy, this.radius - this.lineWidth + 1 + this.lineWidth * 2 / 3, 0, 2 * Math.PI, false);
                    this.g.stroke();
                    return false;
                }
            }
        });
  });
};
*/

$(function($) {
  
  document.getElementById('canvas').width = Math.round((window.innerWidth-100)*.76);
  CanvasHeight = document.getElementById('canvas').height || 0;
  CanvasWidth = document.getElementById('canvas').width || 0;
 
  //initializeKnobs();
  initializeEQ();
  interpolateEQ(3);
  bwScaleFactor = xFromFreq(40);

   window.requestAnimationFrame(drawCanvas);

});
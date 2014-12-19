//DELETE with note holding leaves note forever - have a delete which does that, and one that cleans up oscillators

// WEB AUDIO STUFF ///////////////////////////////////////////////////////////////////////

//var context = new webkitAudioContext();
MIDILOOPTRIGGER = true; //true causes the output to others to slowly decay to zero, and turn off/on your inputs (all except self), only when
						//midi keys are being pressed.  Keys pressed has the loop open, letting go closes the loop on both sides.

toggleOptions = ["log","lin"];
noteAssignmentOptions = ["low", "2low", "3low", "high","2hgh","3hgh","1st","2nd","3rd","4th","rand"];
oscTypeOptions = ["sin","sqr","saw","tri"];
midiLoopOptions = ["no","yes","mod"];
midiLoopState = 1;
midiSustain = false;

MIDIEnabled = true;
gainKnobValue = 1;
gainKnobUpdate = true;

screenToggleState = {
	attackType: 1,
	decayType: 1,
	portamentoType: 1,
	oscType: 0,
	noteAssignment: 0
};

function oscObject () {

	this.effectSettings = {
		attack: 0.1,
		attackType: 1,
		decay: 0.1,
		decayType: 1,
		portamento: 0.05,
		portamentoType: 1,
		oscType: 0,
		noteAssignment: 0
	},
	this.select = false,
	this.playing = 0,
	this.freqScale = 1,
	this.level = 50,
	this.identity = 1,
	this.oscillator = context.createOscillator(),
	this.gainNode = context.createGain ? context.createGain() : context.createGainNode(),
	this.envelope = context.createGain ? context.createGain() : context.createGainNode()
}

//oscObject.prototype.context = new webkitAudioContext();

oscObject.prototype.initializeDefaultEffects = function(freqScale, identity) {
	
	this.freqScale = freqScale;	
	this.identity = identity; 


	this.oscillator.connect(this.gainNode);  
	this.gainNode.connect(this.envelope);
	//this.envelope.connect(this.context.destination);
	this.envelope.connect(synthMixer);

	this.gainNode.gain.value = 0.5;
	this.envelope.gain.value = 0;

	this.oscillator.start(0); 
}

oscObject.prototype.initialize = function(effectSettingsSelected, freqScaleSelected, identity) {
	
	this.effectSettings = effectSettingsSelected;
	this.freqScale = Math.round(freqScaleSelected) + 1;	
	this.identity = identity; 


	this.oscillator.connect(this.gainNode);  
	this.gainNode.connect(this.envelope);
	//this.envelope.connect(this.context.destination);
	this.envelope.connect(synthMixer);

	this.gainNode.gain.value = 0.5;
	this.envelope.gain.value = 0;

	this.oscillator.frequency.value = 200;
	this.oscillator.start(0); 
}



oscArray=[];
oscArray[0] = new oscObject();
oscArray[0].initializeDefaultEffects(1, 1);



returnNewID = function(){
	//run through oscArray and return lowest number not already an ID
	var IDnum = 1;
	while(oscArray.filter(function(arrayObj){ return arrayObj.identity == IDnum })[0]){
		IDnum++;
	}
	return IDnum;
}

updateSelection = function(selectionArray){
	//run through oscArray and update which oscillators are currently selected
	for(var i = 0; i < oscArray.length; i++){
    
        oscArray[i].select = false;
        
        for (identity in selectionArray){
   
            if (oscArray[i].identity == parseInt(selectionArray[identity].substring(1))){
                oscArray[i].select = true;
            }
        }
    
    }
}

deleteSelected = function(){
	//run through oscArray, see whos selected and delete
	for(var i = oscArray.length - 1; i >=0; i--){
    
        if (oscArray[i].select){
        	var now = context.currentTime;
        	oscArray[i].oscillator.stop(now);
            oscArray.splice(i,1);
        }
    }
    
}

oscArrayUpdateGain = function(identity, gain){
	for (ind in oscArray){
		if (oscArray[ind].identity == identity){
			var multiplier = .8;
			oscArray[ind].gainNode.gain.exponentialRampToValueAtTime((Math.exp(multiplier*gain)-1)/(Math.exp(multiplier)-1)+.001, context.currentTime, context.currentTime+100);
                
		}
	}
}

oscArrayUpdateFreqScale = function(identity, freqScale){
	for (ind in oscArray){
		if (oscArray[ind].identity == identity){
			oscArray[ind].freqScale = freqScale;

			oscArray[ind].oscillator.frequency.cancelScheduledValues(0);
			oscArray[ind].oscillator.frequency.setTargetAtTime( oscArray[ind].freqScale*frequencyFromNoteNumber(oscArray[ind].playing), 0, 0.01);	

		}
	}
}


oscArrayUpdateEffectValue = function(effect, value){
//step through all elements, if selected update value
	for (ind in oscArray){
		if (oscArray[ind].select){
			oscArray[ind].effectSettings[effect] = value;

			if (effect == "oscType"){
				switch(value){
					case 1:
						oscArray[ind].oscillator.type = 'square'; console.log('sq');
						break;
					case 2:
						oscArray[ind].oscillator.type = 'sawtooth'; console.log('st');
						break;
					case 3:
						oscArray[ind].oscillator.type = 'triangle'; console.log('tri');
						break;
					default:
						oscArray[ind].oscillator.type = 'sine'; console.log('sin');
				};
			}
		}
	}
}


updateEffectsView = function(selection){
	//get index of oscArray to pull update values from
	var index = oscArray.map(function(e) { return e.identity; }).indexOf(parseInt(selection.substring(1)));

	//update values to screen for knobs and toggles from oscArray[index].effectSettings

	//KNOBS
	//print to screen
	$(".knob#a").val(oscArray[index].effectSettings['attack']*50).trigger("change");
	$(".knob#d").val(oscArray[index].effectSettings['decay']*50).trigger("change");
	$(".knob#p").val(oscArray[index].effectSettings['portamento']*100).trigger("change");


	//TOGGLES
	//write to array
	screenToggleState.attackType=oscArray[index].effectSettings['attackType'];
	screenToggleState.decayType=oscArray[index].effectSettings['decayType'];
	screenToggleState.portamentoType=oscArray[index].effectSettings['portamentoType'];
	screenToggleState.oscType=oscArray[index].effectSettings['oscType'];
	screenToggleState.noteAssignment=oscArray[index].effectSettings['noteAssignment'];

	//print array to screen
	$('#at').html(toggleOptions[screenToggleState.attackType]);
	$('#dt').html(toggleOptions[screenToggleState.decayType]);
	$('#pt').html(toggleOptions[screenToggleState.portamentoType]);
	$('#signalType').html(oscTypeOptions[screenToggleState.oscType]);
	$('#noteBehavior').html(noteAssignmentOptions[screenToggleState.noteAssignment]);
}



// KNOB STUFF ///////////////////////////////////////////////////////////////////////

//LOG KNOB, 0-1
// value from actual knob, k: range 0 to <max_knob>
// value with 'depth' value, n: log(n/<max_knob>*k + 1)/log(n+1)

//EXP KNOB, 0-1
// value from actual knob, k: range 0 to <max_knob>
// value with 'depth' value, n: (exp(n/<max_knob>*k) - 1)/(exp(n)-1)



newOsc = function(){
	var num = returnNewID();
	console.log('create new oscillator, #' + num);

	//add div
	var htmlTag = '<div id="s' + num + '" class="selectable"> <span class="label">#' + num + '</span><input name="value" class="spinner"><div class="sliderBox"><input type="range" min="0" max="100" data-rangeslider class="synthRange"></div></div>';
	$(htmlTag).insertBefore("#modSelector");
	
	//style div
	initializeSliders();
	initializeSpinners();
	intitializeSelectable();
	
	//add oscillator in oscArray
	var osc = new oscObject();
	osc.initializeDefaultEffects(num, num);
	oscArray.push(osc);

	if (oscArray.length == 1){
		SelectFirstOsc();
	}

	//update screen spinner value
	$("#s" + num ).find(" .spinner ").val(num);

}

delSelected = function(){
	//remove oscArray object
	deleteSelected();
	
	//remove div
	console.log("delete " + $(".ui-selected").parent().attr("id"));	      
	$(".ui-selected").parent().remove();	

	if (oscArray.length >= 1){
		SelectFirstOsc();
	}
}

SelectFirstOsc = function(){
	var selectedRows=[];
	var element = $("#s" + oscArray[0]["identity"] + " .label");

    element.addClass("ui-selected");
    element.parent().css("background-color","#FFE1AD");		
   	selectedRows.push(element.html());

	//write selected to screen
	$( '#outputSelect' ).html('Selected channel(s): ' + selectedRows.toString());
	
	//write selected to oscArray
	updateSelection(selectedRows);

	//update effects view
	updateEffectsView(selectedRows[0]);

	console.log("DISABLED"); //disable selectable feature so things don't go crazy if you use sliders
	$( "#selector" ).selectable( "option", "disabled", "true" );
}

initializeSliders = function(){

	$('input[type="range"]').each(function (e) {
		
		var idAudio = $(this).parent().siblings("audio").attr("id");

		$(this).rangeslider({
			polyfill:false,
			rangeClass:'rangeslider',
			fillClass:'rangeslider__fill',
			handleClass:'rangeslider__handle',

			onSlide:function( pos, val){
				
				if (typeof idAudio !== 'undefined'){
					console.log('slider ' +  idAudio + ': ' + val);
                	//update audio input Gain
                	$("#" + idAudio).prop("volume",val);

				}else {

					//update oscArray Gain
					var updateID = $(event.target).closest(".selectable").attr("id");

					if(typeof updateID !== 'undefined'){
						console.log('slider ' + updateID + ': ' + val);
						//oscArray Method	
						oscArrayUpdateGain(updateID.substring(1), val/100);
					}
				}
			}
		});

	});
};


initializeSpinners = function(){
	$( ".spinner" ).each(function (e) {
		
		$(this).spinner({ step:0.01,

			spin: function( event, ui ) {
				//write to console
				console.log('spinner:' + $(event.target).closest(".selectable").attr("id") + ' val:' + ui.value);
			
				//update oscArray FreqScale
				var updateID = $(event.target).closest(".selectable").attr("id");

				if(updateID){
					//oscArray Method	
					oscArrayUpdateFreqScale(updateID.substring(1), ui.value);
				}

			}
		})
	}); //create spinner class
};


intitializeSelectable = function(){
	
	$( "#selector" ).selectable({ filter: "span", disabled: "true", //only label part is 'selectable'

		selected: function( event, ui ) {
			
			var selectedRows=[];

			//update selectedRows variable, update screen background color
			$( ".ui-selected", this ).each(function() {
				$(this).parent().css("background-color","#FFE1AD");
				selectedRows.push($(this).html());
			});	

			//write selected to screen
			$( '#outputSelect' ).html('Selected channel(s): ' + selectedRows.toString());
			
			//write selected to oscArray
			updateSelection(selectedRows);

			//update knobs
			updateEffectsView(selectedRows[0]);

			console.log("DISABLED"); //disable selectable feature so things don't go crazy if you use sliders
			$( "#selector" ).selectable( "option", "disabled", "true" );	
		},
	 
		unselected: function( event, ui ) {

			//change background color back for deselected elements 
			$( ".selectable .label", this ).not(".ui-selected").each(function() {
				$(this).parent().css("background-color","#FFB433");
			});
		}
	});

	$(".selectable .label").mousedown(function(){
		console.log("ENABLED"); //only enable selectable feature when clicking on labels, so things work w/sliders
    	$( "#selector" ).selectable( "option", "disabled", false );
	});

};

initializeKnobs = function(){

    $(".knob").each(function (e) {
		$(this).knob({


            draw : function () {
               
                

                if ($(event.target).closest(".loopEffect").attr("id") == "delayLoopEffect"){
                   delay.delayTime.value = this.cv/50;
                   console.log('delay' + ' ' + this.cv);
  
                } else if ($(event.target).closest(".loopEffect").attr("id") == "gainLoopEffect"){
                	console.log('gain' + ' ' + this.cv);
					gainNode.gain.value = this.cv/9 + 1;
					
                } else if ($(event.target).closest(".loopEffect").attr("id") == "eqGainLoopEffect"){
                  console.log('eqGain' + ' ' + this.cv);		
                  MAXGAIN = MAXGAINSTART * (2*(this.cv/100) + 1);
                  for(ind in eqNodes){
                    eqNodes[ind].gain = gainFromY(eqNodes[ind].y);
                    eqObject[ind].gain.value = eqNodes[ind].gain;
                  }
                } else if ($(event.target).closest(".effect").attr("id") == 'attack'){
                	oscArrayUpdateEffectValue("attack", this.cv/50);

                } else if ($(event.target).closest(".effect").attr("id") == 'decay'){
                	oscArrayUpdateEffectValue("decay", this.cv/50);
                	
                } else if ($(event.target).closest(".effect").attr("id") == 'portamento'){
                	oscArrayUpdateEffectValue("portamento", this.cv/100);
                	
                }




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


incrementScreenToggle = function(effect){
//update screenToggleState variable and screen, return new val
	switch(effect){
		case "attackType":
			screenToggleState.attackType = 1-screenToggleState.attackType;
			$('#at').html(toggleOptions[screenToggleState.attackType]);
			return screenToggleState.attackType;

		case "decayType":
			screenToggleState.decayType = 1-screenToggleState.decayType;
			$('#dt').html(toggleOptions[screenToggleState.decayType]);
			return screenToggleState.decayType;

		case "portamentoType":
			screenToggleState.portamentoType = 1-screenToggleState.portamentoType;
			$('#pt').html(toggleOptions[screenToggleState.portamentoType]);
			return screenToggleState.portamentoType;

		case "oscType":
			screenToggleState.oscType = (++screenToggleState.oscType == oscTypeOptions.length) ? 0: screenToggleState.oscType;
			$('#signalType').html(oscTypeOptions[screenToggleState.oscType]);
			return screenToggleState.oscType;

		case "noteAssignment":
			screenToggleState.noteAssignment = (++screenToggleState.noteAssignment == noteAssignmentOptions.length) ? 0: screenToggleState.noteAssignment;
			$('#noteBehavior').html(noteAssignmentOptions[screenToggleState.noteAssignment]);
			return screenToggleState.noteAssignment;

		default:
			console.log("error");
	};
}

initializeToggles = function(){

	$( ".toggle" ).click(function(){
		
		switch($(event.target).attr("id")){
			case "at":
        		console.log("attack toggle");
        		var val = incrementScreenToggle("attackType");
        		oscArrayUpdateEffectValue("attackType",val);

        		break;
       		case "dt":
        		console.log("decay toggle");
        		var val = incrementScreenToggle("decayType");
        		oscArrayUpdateEffectValue("decayType",val);

        		break;
    		case "pt":
        		console.log("portamento toggle");
        		var val = incrementScreenToggle("portamentoType");
        		oscArrayUpdateEffectValue("portamentoType",val);

        		console.log(oscArray);

        		break;
    		case "signalType":
        		console.log("signal toggle");
        		var val = incrementScreenToggle("oscType");
        		oscArrayUpdateEffectValue("oscType",val);

        		break;
        	case "noteBehavior":
        		console.log("note toggle");
				var val = incrementScreenToggle("noteAssignment");
        		oscArrayUpdateEffectValue("noteAssignment",val);

        		break;
        	case "midiBehavior":
        		console.log("midi toggle");
        		midiLoopState = (++midiLoopState == midiLoopOptions.length) ? 0: midiLoopState;
				$('#midiBehavior').html(midiLoopOptions[midiLoopState]);
				
				if (midiLoopState == 0){ //loop off
					MIDILOOPTRIGGER = false;
				} else if (midiLoopState == 1){ //loop on
					MIDILOOPTRIGGER = true;
				}else if (midiLoopState == 2){ //mod on
					MIDILOOPTRIGGER = false;
				}

        		break;
        	case "midiSustain":
        		console.log("sustain toggle");
        		midiSustain = !midiSustain;
        		if (midiSustain){
        			$("#midiSustain").html('yes');
        		}else {
        			$("#midiSustain").html('no'); 
        			for (var i = activeNotes.length - 1; i >= 0; i--){
        				noteOff(activeNotes[i]);
        			}
        		}

        		break;
			case "add":
        		console.log("add");
        		newOsc();

        		break;
			case "del":
        		console.log("del");
        		delSelected();

        		break;
    		default:
        		console.log('error');
		}
	});


}


function hideNoMidi(){
	$('#synth').css("display","none");
	$('#synthouts').css("display","none");
	MIDIEnabled = false;
}

//////////DOCUMENT READY FUNCTION//////////////
$(function($) {

	initializeSliders();
	initializeSpinners();
	intitializeSelectable();
	initializeKnobs();
	initializeToggles();

	//write spinner value for first div
	$( ".spinner" ).spinner().val(1);
	$(".knob").val(5).trigger("change");
	SelectFirstOsc();



	console.log("MIDI Test Initiated...");
	
	if (navigator.requestMIDIAccess){
		navigator.requestMIDIAccess().then( onMIDIInit, onMIDIReject );
	}else {
		hideNoMidi();
		console.log("No browser MIDI support, please check out http://jazz-soft.net/ and get that browser fixed!")
	}


   
});



//MIDI HANDLING STUFF /////////////////////////////////////////////////////////////////////////

var midiAccess;
var activeNotes = [];

function onMIDIInit(midi) {

			midiAccess = midi;
			if ((typeof(midiAccess.inputs) == "function")) { 
				
				var inputs=midiAccess.inputs();
				
				if (inputs.length === 0){
					hideNoMidi();
					console.log('No MIDI input devices detected.');
				}else { // Hook the message handler for all MIDI inputs
				
					for (var i=0;i<inputs.length;i++)
						inputs[i].onmidimessage = MIDIMessageEventHandler;
					console.log('MIDI successful.');
				}
			} else {  // new MIDIMap implementation
				
				var haveAtLeastOneDevice=false;
			    var inputs=midiAccess.inputs.values();

			    for ( var input = inputs.next(); input && !input.done; input = inputs.next()) {
			    	input.value.onmidimessage = MIDIMessageEventHandler;
			    	haveAtLeastOneDevice = true;
			   		console.log('MIDI successful.');
			    }

			    if (!haveAtLeastOneDevice){
					hideNoMidi();
					console.log("No MIDI input devices detected.");
				}
			}
		}

function onMIDIReject(err) {
			hideNoMidi();
			console.log("MIDI access was rejected, despite the browser supporting it.");
			
		}

function MIDIMessageEventHandler(event) {

			switch (event.data[0] & 0xf0) {
				case 0x90:
					if (event.data[2]!=0) {  // note-on
						noteOn(event.data[1], event.data[2]);
						return;
					}
				case 0x80: //note off
					if (!midiSustain) { noteOff(event.data[1]);}
					return;
				case 0xB0:
					modWheel(event.data[2]);
					return;
			}
		}

function modWheel(value){
	console.log('modwheel:' + value);
	if (midiLoopState==2){
		//change volume of all players to match
		$("audio").each(function (e) {
			//if ($(this).attr('id')!= "you"){
				$(this).prop("volume",value/127.0);
				$(this).parent().find('input').val(value/127.0).change();
		//	}
		});
							
	}
}

function frequencyFromNoteNumber(note) {
			return 440 * Math.pow(2,(note-69)/12);
		}

function noteOn(noteNumber, velocity) {
	activeNotes.push(noteNumber);
	
	if(!gainKnobUpdate && MIDILOOPTRIGGER){
		//turn on output
		gainKnobUpdate = true;

		//turn on input
		$("audio").each(function (e) {
			if ($(this).attr('id')!= "you"){
				$(this).trigger("play");
				$(this).siblings(".audioonoff").html("ON");
				console.log($(this).attr('id') + ' playing');
			}
		});

	}

	updateOscillatorsFromMidiChange();
	
	$( '#outputNotes' ).html('MIDI notes playing: ' + activeNotes.toString());	
	console.log('active notes:' + activeNotes);
}


function noteOff(noteNumber) {
	var position = activeNotes.indexOf(noteNumber);
	if (position!=-1) { activeNotes.splice(position,1); }
	
	updateOscillatorsFromMidiChange();

	$( '#outputNotes' ).html('MIDI notes playing: ' + activeNotes.toString());
	console.log('active notes:' + activeNotes);

	if (activeNotes.length == 0 && MIDILOOPTRIGGER){
		//turn off outputs
		gainKnobUpdate = false;

		//turn off inputs
		$("audio").each(function (e) {
			if ($(this).attr('id')!= "you"){
				$(this).trigger("pause");
				$(this).siblings(".audioonoff").html("OFF");
				console.log($(this).attr('id') + ' paused');
			}
		});
	}

}


function getNoteNumber(noteAssignment){
	//return noteNumber from activeNotes array that you should play based on your noteAssignment
	//noteAssignmentOptions = ["low", "2low", "3low", "high","2hgh","3hgh","1st","2nd","3rd","4th","rand","rndA"];
	var sortedNotes = activeNotes.slice(0);
	sortedNotes.sort(function(a, b) {return a - b;});

	switch(noteAssignment){
		case 0: //lowest note
			return (typeof(sortedNotes[0]) !== 'undefined') ? sortedNotes[0] : 0;
		case 1: //2nd lowest note
			return (typeof(sortedNotes[1]) !== 'undefined') ? sortedNotes[1] : 0;
		case 2: //3rd lowest note
			return (typeof(sortedNotes[2]) !== 'undefined') ? sortedNotes[2] : 0;
		case 3: //highest note
			return (typeof(sortedNotes[sortedNotes.length-1]) !== 'undefined') ? sortedNotes[sortedNotes.length-1] : 0;
		case 4: //2nd highest note
			return (typeof(sortedNotes[sortedNotes.length-2]) !== 'undefined') ? sortedNotes[sortedNotes.length-2] : 0;
		case 5: //3rd highest note
			return (typeof(sortedNotes[sortedNotes.length-3]) !== 'undefined') ? sortedNotes[sortedNotes.length-3] : 0;
		case 6: //first chronological note played
			return (typeof(activeNotes[0]) !== 'undefined') ? activeNotes[0] : 0;
		case 7: //second chronological note played
			return (typeof(activeNotes[1]) !== 'undefined') ? activeNotes[1] : 0;
		case 8: //third chronological note played
			return (typeof(activeNotes[2]) !== 'undefined') ? activeNotes[2] : 0;
		case 9: //fourth chronological note played
			return (typeof(activeNotes[3]) !== 'undefined') ? activeNotes[3] : 0;
		case 10: //random note from activeNotes
			var randIndex = Math.round((Math.random()*activeNotes.length)-0.5);
			return (typeof(activeNotes[randIndex]) !== 'undefined') ? activeNotes[randIndex] : 0;
		default:
			console.log('error in getNoteNumber');
	};

}

function updateOscillatorsFromMidiChange(){
	for (ind in oscArray){
		//get note to play
		var noteNumber = getNoteNumber(oscArray[ind].effectSettings['noteAssignment']);
		
		//compare to playing note and update oscillator frequency
		if (oscArray[ind].playing != noteNumber && noteNumber){
			var now = context.currentTime;
			oscArray[ind].oscillator.frequency.cancelScheduledValues(now);
			oscArray[ind].oscillator.frequency.setValueAtTime(oscArray[ind].oscillator.frequency.value,now);

			if (oscArray[ind].effectSettings['portamentoType']){
				oscArray[ind].oscillator.frequency.linearRampToValueAtTime(oscArray[ind].freqScale*frequencyFromNoteNumber(noteNumber), now + oscArray[ind].effectSettings.portamento);
			}else{
				oscArray[ind].oscillator.frequency.exponentialRampToValueAtTime(oscArray[ind].freqScale*frequencyFromNoteNumber(noteNumber), now + oscArray[ind].effectSettings.portamento);
			}

		}

		//compare note on/off and update envelope
		if (!oscArray[ind].playing && noteNumber){ //was off, now on
			var now = context.currentTime;
			oscArray[ind].envelope.gain.cancelScheduledValues(now);
			oscArray[ind].envelope.gain.setValueAtTime(oscArray[ind].envelope.gain.value, now);

			if (oscArray[ind].effectSettings['attackType']){
				oscArray[ind].envelope.gain.linearRampToValueAtTime(1.0, now + oscArray[ind].effectSettings.attack);
			}else{
				oscArray[ind].envelope.gain.exponentialRampToValueAtTime(1.0, now + oscArray[ind].effectSettings.attack);
			}
		}

		if (oscArray[ind].playing && !noteNumber){ //was on, now off
			var now = context.currentTime;
			oscArray[ind].envelope.gain.cancelScheduledValues(now);
			oscArray[ind].envelope.gain.setValueAtTime(oscArray[ind].envelope.gain.value, now);

			if (oscArray[ind].effectSettings['decayType']){
				oscArray[ind].envelope.gain.linearRampToValueAtTime(0.0, now + oscArray[ind].effectSettings.decay);
			}else{
				oscArray[ind].envelope.gain.exponentialRampToValueAtTime(0.00001, now + oscArray[ind].effectSettings.decay);
			}
		}

		//update playing field
		oscArray[ind].playing = noteNumber;
	}
}



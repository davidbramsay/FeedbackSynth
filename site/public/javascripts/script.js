var audios = [];
var audioIDs = [];
var eqObject =[];
var delay = [];

var PeerConnection = window.PeerConnection 
    || window.webkitPeerConnection00 
    || window.webkitRTCPeerConnection 
    || window.mozRTCPeerConnection 
    || window.RTCPeerConnection;


if (!((typeof webkitAudioContext === "function")
      || (typeof AudioContext === "function")
      || (typeof webkitAudioContext === "object")
      || (typeof AudioContext === "object"))) {
  alert("Sorry! Web Audio not supported by this browser");
}
if (window.hasOwnProperty('webkitAudioContext') &&
    !window.hasOwnProperty('AudioContext')) {
    window.AudioContext = webkitAudioContext;
    window.OfflineAudioContext = webkitOfflineAudioContext;
}

context = new window.AudioContext();

analyser = context.createAnalyser();
analyser.smoothingTimeConstant = 0.7;
analyser.fftSize = 2048;



function getNewAudioID(){
  var newAudioID = 1;

  while(audioIDs.filter(function(arrayObj){ return arrayObj == newAudioID })[0]){
    newAudioID++;
  }
  return newAudioID;
}

function cloneAudio(domId, socketId) {
  var audio = document.getElementById(domId);
  var clone = audio.cloneNode(false);
  var newID = getNewAudioID();
  console.log(newID);

  clone.id = "remote" + socketId;
  
  var htmlpre = '<div class="audioBox" id="audio' + newID + '">';
  $(htmlpre).appendTo("#audios");
  
  document.getElementById('audio' + newID).appendChild(clone);
  var htmlpost = '<span class="labelAudio">' + newID + '</span><div class="audioonoff">OFF</div><div class="sliderBoxRouting"><input type="range" min="0" max="1" step="0.01" data-rangeslider class="routeSlider"></div></div>';
  $(htmlpost).appendTo("#audio" + newID);
  
  initializeSliders();
  initializeAudioToggles();

  $("#audio" + newID + " .routeSlider").val(0.2).change();

  audioIDs.push(newID);
  audios.push(clone);
  return clone;
}

function removeAudio(socketId) {
  var audio = document.getElementById('remote' + socketId);
  if(audio) {
    var ind = audios.indexOf(audio);
    audios.splice(ind, 1);
    
    audio.parentNode.removeChild(audio);
    $("#audio" + audioIDs[ind]).remove();
    
    audioIDs.splice(ind, 1);
  }
}

function addToChat(msg, color) {
  var messages = document.getElementById('messages');
  msg = sanitize(msg);
  if(color) {
    msg = '<p style="color: ' + color + '; padding-left: 15px">' + msg + '</p>';
  } else {
    msg = '<strong style="padding-left: 15px">' + msg + '</strong>';
  }
  messages.innerHTML = '>> ' + msg + '<br>' + messages.innerHTML;
  messages.scrollTop = 10000;
}

function sanitize(msg) {
  return msg.replace(/</g, '&lt;');
}

function initNewRoom() {
  var button = document.getElementById("newRoom");

  button.addEventListener('click', function(event) {

    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 8;
    var randomstring = '';
    for(var i = 0; i < string_length; i++) {
      var rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }

    window.location.hash = randomstring;
    location.reload();
  })
}


var websocketChat = {
  send: function(message) {
    rtc._socket.send(message);
  },
  recv: function(message) {
    return message;
  },
  event: 'receive_chat_msg'
};

var dataChannelChat = {
  send: function(message) {
    for(var connection in rtc.dataChannels) {
      var channel = rtc.dataChannels[connection];
      channel.send(message);
    }
  },
  recv: function(channel, message) {
    return JSON.parse(message).data;
  },
  event: 'data stream data'
};

function initChat() {
  var chat;

  if(rtc.dataChannelSupport) {
    console.log('initializing data channel chat');
    chat = dataChannelChat;
  } else {
    console.log('initializing websocket chat');
    chat = websocketChat;
  }

  var input = document.getElementById("chatinput");
  var room = window.location.hash.slice(1);
  var color = "#" + ((1 << 24) * Math.random() | 0).toString(16);

  

  input.addEventListener('keydown', function(event) {
    var key = event.which || event.keyCode;
    if(key === 13) {
      chat.send(JSON.stringify({
        "eventName": "chat_msg",
        "data": {
          "messages": input.value,
          "room": room,
          "color": color
        }
      }));
      addToChat(input.value);
      input.value = "";
    }
  }, false);

  rtc.on(chat.event, function() {
    var data = chat.recv.apply(this, arguments);
    console.log(data.color);
    addToChat(data.messages, data.color.toString(16));
  });
}



function init() {

  if(PeerConnection) {
    rtc.createStream({
      audio: {
        mandatory: 
          {
          echoCancellation: false,  
          googAutoGainControl: false, 
          googAutoGainControl2: false, 
          googEchoCancellation: false,
          googEchoCancellation2: false,
          googNoiseSuppression: false,
          googNoiseSuppression2: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false}
      },
      video: false
    }, function(stream) {
      document.getElementById('you').src = URL.createObjectURL(stream);
    });
  } else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }


  var room = window.location.hash.slice(1);

  rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);

  rtc.on('add remote stream', function(stream, socketId) {
    console.log("ADDING REMOTE STREAM...");
    var clone = cloneAudio('you', socketId);
    document.getElementById(clone.id).setAttribute("class", "");
    rtc.attachStream(stream, clone.id);
  });

  rtc.on('disconnect stream', function(data) {
    console.log('remove ' + data);
    removeAudio(data);
  });

  initNewRoom();
  initChat();

}


initializeAudioToggles = function() {
  //on/off button
    $('.audioonoff').last().click(function() {
        var aud = $(this).siblings("audio");
        if (aud[0].paused) {
            aud.trigger("play");
            $(this).html('ON');
        } else {
            aud.trigger("pause");
            $(this).html('OFF');
        }
    });


}



$(function($) {
  
   initializeAudioToggles();
   $(".routeSlider").val(0.2).change();

});
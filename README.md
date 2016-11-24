# GroupLoop: a collaborative, network-enabled audio feedback instrument
==============

GroupLoop is a browser-based, collaborative audio feedback control system for musical performance.  It was published in NIME 2015 ([paper](https://davidbramsay.com/public/RamsayNIME.pdf)), and is live on the web [here](https://feedback.davidbramsay.com).

[Click here](https://davidbramsay.com/grouploop) for a short introduction to the concept and a video description/live performance.  


##Set it up yourself locally.

terminal:

```bash 
git clone https://github.com/dramsay9/FeedbackSynth.git
cd FeedbackSynth
npm install
node server.js
```

In a version of Chrome that has webRTC support:

go to [localhost:8080](http://localhost:8080)

click allow when asked about accessing the microphone.

I used some sample code and got to know webRTC from [webRTC.io](https://github.com/webRTC/webRTC.io), thanks to those guys.

var Module;
if (typeof Module === 'undefined') Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');

/**
*
* We can not interact with emscripten using unicide strings
* so we need to manually encode and decode them.
* Thanks to:
* https://gist.github.com/chrisveness/bcb00eb717e6382c5608
*
*/

// Track the number of calls to `recognizer.process` to avoid OOM errors.
let processCallCount = 0;
// Track the last data and callback ID for reinitialization.
let lastData = null;
let lastClbId = null;

function Utf8Encode(strUni) {
    var strUtf = strUni.replace(
        /[\u0080-\u07ff]/g,  // U+0080 - U+07FF => 2 bytes 110yyyyy, 10zzzzzz
        function(c) {
            var cc = c.charCodeAt(0);
            return String.fromCharCode(0xc0 | cc>>6, 0x80 | cc&0x3f); }
    );
    strUtf = strUtf.replace(
        /[\u0800-\uffff]/g,  // U+0800 - U+FFFF => 3 bytes 1110xxxx, 10yyyyyy, 10zzzzzz
        function(c) {
            var cc = c.charCodeAt(0);
            return String.fromCharCode(0xe0 | cc>>12, 0x80 | cc>>6&0x3F, 0x80 | cc&0x3f); }
    );
    return strUtf;
}

function Utf8Decode(strUtf) {
    // note: decode 3-byte chars first as decoded 2-byte strings could appear to be 3-byte char!
    var strUni = strUtf.replace(
        /[\u00e0-\u00ef][\u0080-\u00bf][\u0080-\u00bf]/g,  // 3-byte chars
        function(c) {  // (note parentheses for precedence)
            var cc = ((c.charCodeAt(0)&0x0f)<<12) | ((c.charCodeAt(1)&0x3f)<<6) | (c.charCodeAt(2)&0x3f);
            return String.fromCharCode(cc); }
    );
    strUni = strUni.replace(
        /[\u00c0-\u00df][\u0080-\u00bf]/g,                 // 2-byte chars
        function(c) {  // (note parentheses for precedence)
            var cc = (c.charCodeAt(0)&0x1f)<<6 | c.charCodeAt(1)&0x3f;
            return String.fromCharCode(cc); }
    );
    return strUni;
}

function startup(onMessage) {
    self.onmessage = function(event) {
        var pocketsphinxJS = (event.data && 'pocketsphinx.js' in event.data) ? event.data['pocketsphinx.js'] : 'pocketsphinx.js';
        var pocketsphinxWASM = (event.data && 'pocketsphinx.wasm' in event.data) ? event.data['pocketsphinx.wasm'] : '/webapp/js/pocketsphinx.wasm';
        // Case of compilation to WebAssembly, this is an absolute path
        Module.locateFile = function() {return pocketsphinxWASM;}
        Module.onRuntimeInitialized = function() {
            self.onmessage = onMessage;
            self.postMessage({});
        };
	importScripts(pocketsphinxJS);
    };
}

startup(function(event) {
    switch(event.data.command){
    case 'initialize':
	initialize(event.data.data, event.data.callbackId);
	break;
	  case 'configure':
			configure(event.data.data);
	break;
    case 'load':
	load(event.data.data, event.data.callbackId);
	break;
    case 'lazyLoad':
	lazyLoad(event.data.data, event.data.callbackId);
	break;
    case 'addWords':
	addWords(event.data.data, event.data.callbackId);
	break;
    case 'addGrammar':
	addGrammar(event.data.data, event.data.callbackId);
	break;
    case 'lookupWord':
	lookupWord(event.data.data, event.data.callbackId);
	break;
    case 'lookupWords':
	lookupWords(event.data.data, event.data.callbackId);
	break;
    case 'addKeyword':
	addKeyword(event.data.data, event.data.callbackId);
	break;
    case 'start':
	start(event.data.data);
	break;
    case 'stop':
	stop();
	break;
    case 'process':
	process(event.data.data);
	break;
    }
});

var mySelf = this;
var post = function(message) {
    mySelf.postMessage(message);
};

var recognizer;
var buffer;
var segmentation;

function segToArray(segmentation) {
    var output = [];
    for (var i = 0 ; i < segmentation.size() ; i++)
	output.push({'word': Utf8Decode(segmentation.get(i).word),
		     'start': segmentation.get(i).start,
		     'end': segmentation.get(i).end});
    return output;
};

class Resampler extends EventTarget {
	constructor({sampleRate}) {
		super();

		const config = {};
		let recBuffers = [];
		// var inputBufferLength = config.inputBufferLength || 4096;
		var outputBufferLength = config.outputBufferLength || 4000;
		const inSampleRate = sampleRate;
		const outputSampleRate = config.outputSampleRate || 16000;
		
		this.handle = inputBuffer => {
			// var isSilent = true;
			for (var i = 0 ; i < inputBuffer.length ; i++) {
				recBuffers.push(inputBuffer[i] * 2 * 16383.0);
			}
			while (outputBufferLength < recBuffers.length * outputSampleRate / inSampleRate) {
				var result = new Int16Array(outputBufferLength);
				var bin = 0;
				var num = 0;
				var indexIn = 0;
				var indexOut = 0;
				while (indexIn < outputBufferLength) {
					bin = 0;
					num = 0;
					while(indexOut < Math.min(recBuffers.length, (indexIn + 1) * inSampleRate / outputSampleRate)) {
						bin += recBuffers[indexOut];
						num += 1;
						indexOut++;
					}
					result[indexIn] = bin / num;
					// if(isSilent && (result[indexIn] != 0)) isSilent = false;
					indexIn++;
				}
				/* var output = {};
				output.command = 'newBuffer';
				output.data = result;
				if (isSilent) output.error = "silent"; */

				this.dispatchEvent(new MessageEvent('data', {
					data: result,
				}));
				
				recBuffers = recBuffers.slice(indexOut);
			}
		};
	}

	send(data) {
		this.handle(data);
	}
}

let resampler = null;
function configure({sampleRate}) {
	resampler = new Resampler({
		sampleRate,
	});
	resampler.addEventListener('data', e => {
		process2(e.data);
	});
}

function initialize(data, clbId) {
    // Update last data and callback ID.
		lastData = JSON.parse(JSON.stringify(data))
		lastClbId = clbId

    var config = new Module.Config();
    buffer = new Module.AudioBuffer();
    if (data) {
	while (data.length > 0) {
	    var p = data.pop();
	    if (p.length == 2) {
		config.push_back([p[0],p[1]]);
	    } else {
		post({status: "error", command: "initialize", code: "js-data"});
	    }
	}
    }
    var output;
    if(recognizer) {
	output = recognizer.reInit(config);
	if (output != Module.ReturnType.SUCCESS) post({status: "error", command: "initialize", code: output});
	else post({status: "done", command: "initialize", id: clbId});
    } else {
	recognizer = new Module.Recognizer(config);
	segmentation = new Module.Segmentation();
	if (recognizer === undefined) post({status: "error", command: "initialize", code: Module.ReturnType.RUNTIME_ERROR});
	else post({status: "done", command: "initialize", id: clbId});
    }
    config.delete();
}

function load(data, clbId) {
    try {
	importScripts.apply(this, data);
	post({status: "done", command: "load", id: clbId});
    } catch(e) {
	post({status: "error", command: "load", code: "NETWORK_ERROR"});
    }
}

function lazyLoad(data, clbId) {
    var files = [];
    var folders = [];
    data.folders.forEach(function(folder) {folders.push([folder[0], folder[1]]);});
    data.files.forEach(function(file) {files.push([file[0], file[1], file[2]]);});
    var preloadFiles = function() {
	folders.forEach(function(folder) {
	    Module.FS_createPath(folder[0], folder[1], true, true);
	});
	files.forEach(function(file) {
	    Module.FS_createLazyFile(file[0], file[1], file[2], true, true);
	});
    };
    if (Module.calledRun) {
	preloadFiles();
    } else {
	if (!Module.preRun) Module.preRun = [];
	Module.preRun.push(preloadFiles); // FS is not initialized yet, wait for it
    }
    post({status: "done", command: "lazyLoad", id: clbId});
}

function addWords(data, clbId) {
    if (recognizer) {
	var words = new Module.VectorWords();
	for (var i = 0 ; i < data.length ; i++) {
	    var w = data[i];
	    if (w.length == 2) words.push_back([Utf8Encode(w[0]), w[1]]);
	}
	var output = recognizer.addWords(words);
	if (output != Module.ReturnType.SUCCESS) post({status: "error", command: "addWords", code: output});
	else post({id: clbId});
	words.delete();
    } else post({status: "error", command: "addWords", code: "js-no-recognizer"});
}

function addGrammar(data, clbId) {
    var output;
    if (recognizer) {
	if (data.hasOwnProperty('numStates') && data.numStates > 0 &&
	    data.hasOwnProperty('start') &&
	    data.hasOwnProperty('end') &&
	    data.hasOwnProperty('transitions') && data.transitions.length > 0) {
	    var transitions = new Module.VectorTransitions();
	    while (data.transitions.length > 0) {
		var t = data.transitions.pop();
		if (t.hasOwnProperty('from') && t.hasOwnProperty('to')) {
		    if (!t.hasOwnProperty('word')) t.word = "";
		    if (!t.hasOwnProperty('logp')) t.logp = 0;
		    t.word = Utf8Encode(t.word);
		    transitions.push_back(t);
		}
	    }
	    var id_v = new Module.Integers();
	    output = recognizer.addGrammar(id_v, {start: data.start, end: data.end, numStates: data.numStates, transitions: transitions});
	    if (output != Module.ReturnType.SUCCESS) post({status: "error", command: "addGrammar", code: output});
	    else post({id: clbId, data: id_v.get(0), status: "done", command: "addGrammar"});
	    transitions.delete();
	    id_v.delete();
	} else post({status: "error", command: "addGrammar", code: "js-data"});

    } else post({status: "error", command: "addGrammar", code: "js-no-recognizer"});
}

function lookupWord(data, clbId) {
    if (recognizer) {
	var output = recognizer.lookupWord(Utf8Encode(data));
	post({id: clbId, data: output, status: "done", command: "lookupWord"});
    } else post({status: "error", command: "lookupWord", code: "js-no-recognizer"});
};

function lookupWords(data, clbId) {
    if (recognizer) {
	var output = [];
	data.forEach(function(word) {
	    var wid = recognizer.lookupWord(Utf8Encode(word));
	    if(wid && (output.indexOf(word) == -1))
		output.push(word);
	});
	post({id: clbId, data: output, status: "done", command: "lookupWords"});
    } else post({status: "error", command: "lookupWords", code: "js-no-recognizer"});
};

function addKeyword(data, clbId) {
    var output;
    if (recognizer) {
	if (data.length > 0) {
	    var id_v = new Module.Integers();
	    output = recognizer.addKeyword(id_v, data);
	    if (output != Module.ReturnType.SUCCESS) post({status: "error", command: "addKeyword", code: output});
	    else post({id: clbId, data: id_v.get(0), status: "done", command: "addKeyword"});
	    id_v.delete();
	} else post({status: "error", command: "addKeyword", code: "js-data"});

    } else post({status: "error", command: "addKeyword", code: "js-no-recognizer"});
}

function start(id) {
    if (recognizer) {
	var output;
	output = recognizer.switchSearch(parseInt(id));
	if (output != Module.ReturnType.SUCCESS) {
	    post({status: "error", command: "switchgrammar", code: output});
	    return;
	}
	output = recognizer.start();
	if (output != Module.ReturnType.SUCCESS)
	    post({status: "error", command: "start", code: output});
    } else {
	post({status: "error", command: "start", code: "js-no-recognizer"});
    }

  _startLoop();
}

function stop() {
    if (recognizer) {
	var output = recognizer.stop();
	if (output != Module.ReturnType.SUCCESS)
	    post({status: "error", command: "stop", code: output});
	else {
	    recognizer.getHypseg(segmentation);
	    post({hyp: Utf8Decode(recognizer.getHyp()),
		  hypseg: segToArray(segmentation),
		  final: true});
	}
    } else {
	post({status: "error", command: "stop", code: "js-no-recognizer"});
    }

	_stopLoop();
}

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const lastVowelTimestamps = new Float32Array(VOWELS.length);
for (let i = 0; i < lastVowelTimestamps.length; i++) {
	lastVowelTimestamps[i] = -Infinity;
}
let vowelIndex = -1;
const result = new Float32Array(VOWELS.length);
const vowelDecayTime = 1000;
const _getLastWord = function(hyp, pred = () => true) {
	let lastWord = '';
	let i = hyp.length - 1;
	while (i >= 0) {
		for (; i >= 0; i--) {
			if (hyp[i] === ' ' && lastWord.length !== 0) {
				break;
			}
			if (hyp[i] !== ' ') {
				lastWord = hyp[i] + lastWord;
			}
		}
		if (pred(lastWord)) {
		  break;
		} else {
		  lastWord = '';
		}
	}
	return lastWord;
};
function _pushResult(hyp) {
	const lastWord = _getLastWord(hyp, word => word !== 'SIL' && VOWELS.some(v => word.includes(v)));
	vowelIndex = VOWELS.findIndex(v => lastWord.includes(v));
	if (vowelIndex !== -1) {
		lastVowelTimestamps[vowelIndex] = performance.now();
	}
}
function _updateResult() {
	for (let i = 0; i < VOWELS.length; i++) {
		if (i === vowelIndex) {
			result[i] = 1;
		} else {
			result[i] = Math.max(0, 1 - (performance.now() - lastVowelTimestamps[i]) / vowelDecayTime);
		}
	}
}

function process(array) {
	resampler.send(array);
}
function process2(array) {
  if (recognizer) {
		while (buffer.size() < array.length) {
			buffer.push_back(0);
		}
		for (var i = 0 ; i < array.length ; i++) {
			buffer.set(i, array[i]);
		}
		processCallCount++;

    // Calls to `recognizer.process` permanently increase memory usage.
    // Due to WASM limitations, an OOM error occurs after too many calls.
    // We avoid this by reinitializing the recognizer every 1000 calls.
		if (processCallCount >= 1000) {
			reinitializeRecognizer();

      // Reset processCallCount to avoid overflow.
      processCallCount = 0;
		}

		var output = recognizer.process(buffer);
		if (output != Module.ReturnType.SUCCESS) {
			post({status: "error", command: "process", code: output});
	  } else {
			recognizer.getHypseg(segmentation);
			const hyp = Utf8Decode(recognizer.getHyp());
			/* post({
				hyp: Utf8Decode(recognizer.getHyp()),
				hypseg: segToArray(segmentation),
			}); */
			_pushResult(hyp);
			/* post({
				result,
			}); */
	  }
  } else {
	  post({status: "error", command: "process", code: "js-no-recognizer"});
  }
}

let interval = null;
const _startLoop = () => {
	interval = setInterval(() => {
		_updateResult();
		post({
			result,
		});
	}, 1000/60);
};
const _stopLoop = () => {
  clearInterval(interval);
  interval = null;
};

function reinitializeRecognizer() {
  cleanup()
	initialize(lastData, lastClbId);
	start('');
}

function cleanup() {
  recognizer.delete();
  recognizer = null;
  buffer.delete();
  buffer = null;
  segmentation.delete();
  segmentation = null;
}

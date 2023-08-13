(function() {

  const enginePort = 'com.ajowsentry.chessanalyzer.engine';

  const DEBUG = true;

  class Parser {
    
    /**
     * 
     * @param {string} message 
     * @returns {object}
     */
    parseId(message) {
      let [_, key] = message.split(' ', 2);
      return {
        key,
        value: message.substring(2 + _.length + key.length),
      };
    }

    /**
     * 
     * @param {string} message 
     * @returns {object}
     */
    parseOption(message) {
      message = message.substring(12);

      let key = message.substring(0, message.indexOf(' type '));
      message = message.substring(key.length + 6);

      let split = message.split(' '); 
      let type = split.shift();

      let result = { key, type };

      while(split.length > 0) {
        let splitLength = split.length;

        if(split[0] == 'default') {
          split.shift();
          if(type == 'string') {
            result.defaultValue = split.join(' ');
            if(result.defaultValue == '<empty>')
              result.defaultValue = '';
            split = [];
          }
          else if(type == 'check') {
            result.defaultValue = split[0] == 'true';
            split.shift();
          } 
          else if(type == 'spin') {
            result.defaultValue = parseInt(split[0]);
            split.shift();
          }
          else if(type == 'combo') {
            result.defaultValue = split[0];
            split.shift();
          }
        }

        else if(split[0] == 'min') {
          split.shift();
          result.minValue = parseInt(split.shift());
        }

        else if(split[0] == 'max') {
          split.shift();
          result.maxValue = parseInt(split.shift());
        }

        else if(split[0] == 'var') {
          split.shift();

          if(typeof result.vars === 'undefined')
            result.vars = [];

          result.vars.push(split.shift());
        }

        if(split.length == splitLength)
          break;
      }

      return result;
    }

    /**
     * @param {string} message
     * @returns {object}
     */
    parseInfo(message) {
      message = message.substring(5);
      const fields = new Set([
        'depth', 'seldepth', 'time', 'nodes', 'pv', 'multipv',
        'score', 'currmove', 'currmovenumber', 'hashfull',
        'nps', 'tbhits', 'cpuload', 'string', 'refutation', 'currline',
      ]);

      let result = {};
      
      while(message.length > 0 && fields.size > 0) {
        let found = null;
        for(let field of fields) {
          if(message.startsWith(field + ' ')) {
            found = field;

            if(message.startsWith('string')) {
              result[field] = message.substring(field.length + 1);
              message = '';
            }

            else if(message.startsWith('pv') || message.startsWith('refutation') || message.startsWith('currline')) {
              let values = message.split(' ');
              result[values.shift()] = values;
              message = '';
            }

            else if(message.startsWith('score')) {
              let [_field, type, value] = message.split(' ', 3);
              let score = { type, value };
              message = message.substring(value.length + type.length + field.length + 3);
              if(message.startsWith('upperbound')) {
                score.boundtype = 'upper';
                message = message.substring(11);
              }
              else if(message.startsWith('lowerbound')) {
                score.boundtype = 'lower';
                message = message.substring(11);
              }
              result[field] = score;
            }

            else {
              let [_field, value] = message.split(' ', 2);
              result[field] = value;
              message = message.substring(value.length + field.length + 2);
            }
          }
        }

        if(found === null) {
          console.error(`Unexpected error! could not process info message '${message}'`);
        }
        else {
          fields.delete(found);
        }
      }

      return result;
    }

    /**
     * @param {string} message
     * @returns {object}
     */
    parseBestMove(message) {
      message = message.substring(9);
      let [move, ponder] = message.split(' ponder ');
      return {move, ponder};
    }
  }

  class Engine {

    /** @type {boolean} */
    #initialized = false;

    #port;

    /**
     * @type {object}
     */
    #identity = { };

    /**
     * @type {object[]}
     */
    #availableOptions = [];

    /**
     * @type {Parser}
     */
    #parser;

    /**
     * @type {boolean}
     */
    #isSearching = false;

    /**
     * @type {Set<Function>}
     */
    #infoCallbacks = new Set();

    #connectPort() {
      let port = browser.runtime.connectNative(enginePort);
      if(DEBUG) {
        port.onMessage.addListener(m => console.debug(m));
      }
      return port;
    }

    get availableOptions() {
      return this.#availableOptions;
    }

    get identity() {
      return this.#identity;
    }

    constructor() {
      this.#parser = new Parser();
    }

    addInfoCallback(callback) {
      if(typeof callback === 'function')
        this.#infoCallbacks.add(callback);
    }

    removeInfoCallback(callback) {
      this.#infoCallbacks.delete(callback);
    }

    async initialize() {
      if(this.#initialized)
        return;

      await new Promise(async resolve => {
        this.#port = this.#connectPort();
        this.#port.postMessage('uci');
        this.#identity = { };
        this.#availableOptions.length = 0;

        let waitUciOK = res => {
          if(res == 'uciok') {
            this.#port.onMessage.removeListener(waitUciOK);
            if(DEBUG) {
              console.debug('Engine initialized');
            }
            resolve();
          }

          else if(res.startsWith('id')) {
            let response = this.#parser.parseId(res);
            this.#identity[response.key] = response.value;
          }

          else if(res.startsWith('option')) {
            let response = this.#parser.parseOption(res);
            this.#availableOptions.push(response);
          }
        };

        this.#port.onMessage.addListener(waitUciOK);
        this.#initialized = true;
      });
    }

    async isReady() {
      await new Promise(async resolve => {
        this.#port.postMessage('isready');
        let waitReadyOK = res => {
          if(res == 'readyok') {
            this.#port.onMessage.removeListener(waitReadyOK);
            resolve(true);
          }
        };

        this.#port.onMessage.addListener(waitReadyOK);
      });
    }

    async setOption(name, value) {
      let hasOption = -1 !== this.#availableOptions.findIndex(o => o.key == name);
      if(!hasOption) {
        console.error(`This engine does not have "${name}" option`);
        return;
      }

      await this.isReady();
      this.#port.postMessage(`setoption name ${name} value ${value}`);
      console.info(`Set option ${name} = ${value}`);
    }

    async setOptions(options) {
      for(let o of options) {
        await this.setOption(o.name, o.value);
      }
    }

    async newGame() {
      await this.isReady();
      this.#port.postMessage('ucinewgame');
    }

    async setPosition(args) {
      await this.isReady();
      let position = args.fen ? `fen ${args.fen}` : 'startpos';
      let moves = Array.isArray(args.moves) ? `moves ${args.moves.join(' ')}` : '';
      this.#port.postMessage(`position ${position} ${moves}`);
    }

    async go(args) {
      if(this.#isSearching) {
        console.error('Engine currently in searching');
        return;
      }

      await this.isReady();
      if(!args) args = { };

      return await new Promise(resolve => {
        let command = 'go ';
        
        if(args.ponder === true) {
          command += 'ponder ';
        }

        if(args.infinity === true) {
          command += 'infinity ';
        }

        const fields = ['wtime', 'btime', 'winc', 'binc', 'movestogo', 'depth', 'nodes', 'mate', 'movetime'];
        for(let arg of fields) {
          if(typeof args[arg] !== 'undefined') {
            command += `${arg} ${args[arg]} `;
          }
        }

        if(Array.isArray(args.searchmoves)) {
          command += 'searchmoves ' + args.searchmoves.join(' ');
        }

        let infoList = [];

        let callback = message => {
          if(message.startsWith('info ')) {
            let info = this.#parser.parseInfo(message);
            infoList.push(info);
            this.#infoCallbacks.forEach(fn => fn(info));
          }
          else if(message.startsWith('bestmove ')) {
            let bestMove = this.#parser.parseBestMove(message);
            this.#port.onMessage.removeListener(callback);
            resolve(bestMove);
            this.#isSearching = false;
          }
        };

        this.#port.onMessage.addListener(callback);

        this.#port.postMessage(command);
        this.#isSearching = true;
      });
    }

    async stop() {
      if(this.#isSearching) {
        await this.isReady();
        this.#port.postMessage('stop');
      }
    }
  }

  const engine = new Engine();
  
  if(typeof module !== 'undefined')
    module.exports = { Engine: engine };

  if(typeof window !== 'undefined') {
    
    if(typeof window.chessAnalyzer === 'undefined')
      window.chessAnalyzer = { };

    if(typeof window.chessAnalyzer.Engine === 'undefined')
      window.chessAnalyzer.Engine = engine;
  }

  console.debug('engine.js loaded');
})();
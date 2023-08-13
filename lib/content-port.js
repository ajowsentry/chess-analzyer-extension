(function(){

  const contentPortName = 'com.ajowsentry.chessAnalyzer.contentScript';

  class ContentPort {
    /** @type {number} */
    #lastCommandID = 0;

    #port;

    constructor() {
      this.#port = browser.runtime.connect({name: contentPortName});
    }

    async sendCommand(command, ...args) {
      let oCommand = {
        id: ++this.#lastCommandID,
        command,
        arguments: args
      };

      return new Promise((resolve, reject) => {
        this.#port.postMessage(oCommand);
        let waitResult = response => {
          if(response.id == oCommand.id) {
            if(response.error) {
              reject(response.data);
            }
            else {
              resolve(response.data);
            }
            this.#port.onMessage.removeListener(waitResult);
          }
        };
        this.#port.onMessage.addListener(waitResult);
      });
    }

    addListener(callback) {
      if(typeof callback === 'function')
        this.#port.onMessage.addListener(callback);
    }

    removeListener(callback) {
      if(typeof callback === 'function')
        this.#port.onMessage.removeListener(callback);
    }
  }

  if(typeof module !== 'undefined')
    module.exports = { ContentPort };

  if(typeof window !== 'undefined') {
    if(typeof window.chessAnalyzer === 'undefined')
      window.chessAnalyzer = { };

    if(typeof window.chessAnalyzer.ContentPort === 'undefined')
      window.chessAnalyzer.ContentPort = ContentPort;
  }
})();
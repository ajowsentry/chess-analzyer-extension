(function() {

  const contentPortName = 'com.ajowsentry.chessAnalyzer.contentScript';
  const engine = window.chessAnalyzer.Engine;

  browser.runtime.onConnect.addListener(port => {
    if(port.name === contentPortName) {
      handlePort(port);
    }
  });

  function handlePort(port) {
    let infoCallback = null;

    let sendResponse = (request, response) => {
      port.postMessage({
        id: request.id,
        command: request.command,
        error: false,
        message: 'OK',
        data: null,
        ...(response ?? { }),
      });
    };

    let requestHandler = request => {
      if(typeof engine[request.command] === 'undefined') {
        sendResponse(request, {error: true, message: `Command "${request.command}" is not exists` });
      }

      else if(request.command === 'addInfoCallback') {
        if(infoCallback === null) {
          infoCallback = info => sendResponse(request, { command: 'infoCallback', data: info });
          engine.addInfoCallback(infoCallback);
        }
        sendResponse(request);
      }

      else if(request.command === 'removeInfoCallback') {
        if(infoCallback !== null) {
          engine.removeInfoCallback(infoCallback);
          infoCallback = null;
        }
        sendResponse(request);
      }

      else if(typeof engine[request.command] === 'function') {
        Promise.resolve(engine[request.command] (...request.arguments))
        .then(result => {
          sendResponse(request, { data: result ?? null });
        })
        .catch(err => {
          sendResponse(request, { error: true, message: 'Error', data: err ?? null });
        });
      }

      else {
        sendResponse(request, { data: engine[request.command] });
      }
    };

    port.onMessage.addListener(requestHandler);
    port.onDisconnect.addListener(() => {
      if(infoCallback !== null)
        engine.removeInfoCallback(infoCallback);
    });
  }
})();
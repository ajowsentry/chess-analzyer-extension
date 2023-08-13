(function() {
  if(typeof window.chessAnalyzer === 'undefined') {
    window.chessAnalyzer = { };
  }

  if(typeof window.chessAnalyzer.platforms === 'undefined') {
    window.chessAnalyzer.platforms = { };
  }

  if(typeof window.chessAnalyzer.platforms.ChessCom !== 'undefined') {
    return;
  }

  const nodeSet = new Set();
  const moveSet = new Array();

  let onMoveAddedEvent, onInitializedEvent, onInitializingEvent;
  let retries = 0;

  const observer = new MutationObserver(mutationList => {
    for(let mutation of mutationList) {
      if(mutation.type === 'childList') {
        for(let node of mutation.addedNodes) {
          if(node.nodeName == 'DIV' && node.classList.contains('node')) {
            scanMove(node);
          }
        }
        for(let node of mutation.removedNodes) {
          if(node.nodeName == 'VERTICAL-MOVE-LIST') {
            initialize();
            return;
          }
        }
      }
    }
  });

  function scanMove(node) {
    if(!nodeSet.has(node)) {
      let move = '';
      for(let n of node.childNodes)
        move += n.nodeName == 'SPAN' ? n.dataset.figurine : n.data;
      
      nodeSet.add(node);
      moveSet.push(move);

      if(typeof onMoveAddedEvent === 'function')
        onMoveAddedEvent(move, moveSet, nodeSet);
    }
  }

  function scanMoves() {
    let nodes = document.querySelectorAll('vertical-move-list .node');
    for(let node of nodes) {
      scanMove(node);
    }

    return moveSet;
  }

  function observeMoves() {
    let element = document.querySelector('move-list-wc');
    if(element === null) {
      if(retries++ < 100)
        setTimeout(observeMoves, 500);
      else retries = 0;

      return;
    }

    nodeSet.clear();
    moveSet.length = 0;
    scanMoves();
    observer.observe(element, {
      subtree: true,
      childList: true,
      attributes: false,
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false,
    });
    retries = 0;
  }

  function removeAd() {
    document.body.classList.remove('with-und');
    document.getElementById('board-layout-ad')?.remove();
  }

  function initialize() {
    observer.disconnect();
    if(typeof onInitializingEvent === 'function')
      onInitializingEvent();

    observeMoves();

    if(typeof onInitializedEvent === 'function')
      onInitializedEvent();
  }

  function onInitialized(callback) {
    if(typeof callback === 'function')
      onInitializedEvent = callback;
  }

  function onMoveAdded(callback) {
    if(typeof callback === 'function')
      onMoveAddedEvent = callback;
  }

  function onInitializing(callback) {
    if(typeof callback === 'function')
      onInitializingEvent = callback;
  }

  function getMillis(side) {
    let sideClass = side == 'b' ? '.clock-black' : '.clock-white';
    let timeString = document.querySelector(sideClass).innerText;
    let millis = 0;
    if(timeString.endsWith('days')) {
      millis = 86_400_000 * parseInt(timeString.split(' ')[0]);
    }
    else if(timeString.endsWith('hours')) {
      millis = 3_600_000 * parseInt(timeString.split(' ')[0]);
    }
    else {
      let [minutes, seconds] = timeString.split(':');
      millis += 60_000 * parseInt(minutes);
      seconds += 1000 * parseFloat(seconds);
    }
    return parseInt(millis);
  }

  function getTime() {
    return {
      b: getMillis('b'),
      w: getMillis('w'),
    };
  }

  window.chessAnalyzer.platforms.ChessCom = {
    initialize, removeAd, onInitialized, onMoveAdded, onInitializing, getTime,
  };
})();
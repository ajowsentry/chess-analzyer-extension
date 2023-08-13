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

  const elementsID = {
    markFrom: 'ajowsentry-chessanalyzer-mark-from',
    markTo: 'ajowsentry-chessanalyzer-mark-to',
    button: 'ajowsentry-chessanalyzer-button',
  };

  let isObserving = false;

  let onMoveAddedEvent, onInitializedEvent, onInitializingEvent;

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
      for(let n of node.childNodes) {
        if(n.nodeName == 'SPAN' && n.dataset.figurine)
          move += n.dataset.figurine;
        else if(n.nodeName == '#text')
          move += n.data;
      }
      
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

  async function getElementWait(querySelector, retries) {
    if(typeof retries === 'undefined')
      retries = 30;
    
    return await new Promise((resolve, reject) => {
      let retries = 200;
      let callback = () => {
        let element = document.querySelector(querySelector);
        if(element !== null)
          resolve(element);
        else if(retries-- > 0)
          setTimeout(callback, 500);
        else reject();
      };
      callback();
    });
  }

  async function observeMoves() {
    let element = await getElementWait('#board-layout-sidebar');

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
  }

  function removeAd() {
    document.body.classList.remove('with-und');
    getElementWait('#board-layout-ad').then(el => el.remove());
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
    let clockElement = document.querySelector(sideClass);
    if(clockElement === null) {
      return 86_400_000;
    }

    let timeString = clockElement.innerText;
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

  function createElement(htmlString) {
    let el = document.createElement('div');
    el.innerHTML = htmlString;
    return el.firstChild;
  }

  async function markMove(move) {
    let elFrom = document.getElementById(elementsID.markFrom);
    if(elFrom !== null) {
      elFrom.remove();
    }

    let elTo = document.getElementById(elementsID.markTo);
    if(elTo !== null) {
      elTo.remove();
    }

    if(move === '(none)') {
      return;    
    }
    
    elFrom = createElement(`<div id="${elementsID.markFrom}" style="border: 3px dotted red; background: transparent;" class="highlight"></div>`);
    elTo = createElement(`<div id="${elementsID.markTo}" style="border: 3px solid red; background: transparent;" class="highlight"></div>`);

    let from = `${move.codePointAt(0) - 96}${move[1]}`;
    let to = `${move.codePointAt(2) - 96}${move[3]}`;

    elFrom.classList.add(`square-${from}`);
    elTo.classList.add(`square-${to}`);

    let board = await getElementWait('chess-board');
    board.prepend(elFrom);
    board.prepend(elTo);
  }

  getElementWait('.nav-menu-area').then(menu => {
    let analyzerButton = document.getElementById('ajowsentry-chessanalyzer-button');
    if(!analyzerButton) {
      menu.prepend(createElement(`<button id="ajowsentry-chessanalyzer-button" aria-label="Analyzer" class="nav-action" type="button" title="Toggle analyzer">
        <div><span class="icon-font-chess king-black"></span></div>
        <span class="nav-link-text">
          <span class="light">Analyzer</span>
        </span>
      </button>`));
    }
  });

  getElementWait('#ajowsentry-chessanalyzer-button').then(button => {
    button.addEventListener('click', function() {
      if(isObserving) {
        observer.disconnect();
        button.querySelector('.icon-font-chess').classList.remove('king-white');
        button.querySelector('.icon-font-chess').classList.add('king-black');
        isObserving = false;
        document.getElementById('mark-from')?.remove();
        document.getElementById('mark-to')?.remove();
      }
      else {
        initialize();
        button.querySelector('.icon-font-chess').classList.add('king-white');
        button.querySelector('.icon-font-chess').classList.remove('king-black');
        isObserving = true;
      }
    });
  });

  function scanBoard() {
    let arr = new Array(64).fill('1');
    document.querySelectorAll('chess-board .piece').forEach(el => {
      let classValue = el.attributes.class.value;
      let [_square, square] = classValue.match(/square-(\d\d)/);
      let [piece] = classValue.match(/[bw][rnbqkp]/);
      
      piece = piece[0] == 'b' ? piece[1].toLowerCase() : piece[1].toUpperCase();
      let row = 8 - parseInt(square[1]);
      let col = parseInt(square[0]) - 1;

      arr[col + row * 8] = piece;
    });

    let placement = arr.join('').match(/.{8}/g).join('/');
    for(let n = 8; n >= 2; n--) {
      placement = placement.replaceAll('1'.repeat(n), n)
    };

    return placement;
  }

  window.chessAnalyzer.platforms.ChessCom = {
    initialize, removeAd, onInitialized, onMoveAdded, onInitializing, getTime, markMove, scanBoard
  };
})();
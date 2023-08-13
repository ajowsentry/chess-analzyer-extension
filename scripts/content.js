(function() {
  const Analyzer = (() => {
    let platform = 'unknown', page = null;
    if (location.host.match(/^(?:www\.)?chess\.com$/)) {
      platform = 'chess.com';
      page = window.chessAnalyzer.platforms.ChessCom;
    }
    else if (location.host.match(/^(?:www\.)?lichess\.org$/)) {
      platform = 'lichess.org';
      page = window.chessAnalyzer.platforms.ChessCom;
    }
    
    return { name: platform, platform: page };
  })();

  if (Analyzer.name === 'unknown' || typeof Analyzer.platform === 'undefined') {
    return;
  }

  let board, timeoutID;
  
  const port = new window.chessAnalyzer.ContentPort();
  const storage = window.chessAnalyzer.Storage;

  let queue = [];
  let isProcessing = false;
  async function enqueueBestmove(fenstring) {
    queue.push(fenstring);
    if(isProcessing)
      return;

    isProcessing = true;
    while(queue.length > 0) {
      let fen = queue.shift();

      let time = Analyzer.platform.getTime();
      await port.sendCommand('setPosition', { fen });
      let {move} = await port.sendCommand('go', {
        depth: 10,
        wtime: time.w,
        btime: time.b,
      });
      console.log('best ' + move);
      Analyzer.platform.markMove(move);
    }

    isProcessing = false;
  }

  Analyzer.platform.onInitializing(async () => {
    board = new window.chessAnalyzer.Board();
    await port.sendCommand('initialize');
    await port.sendCommand('setOptions', storage.getOptions());
  });

  Analyzer.platform.onMoveAdded((move) => {
    let oMove = board.move(move);
    console.debug(`${move} -> ${oMove.from.key}${oMove.to.key}`);
    if(typeof timeoutID !== 'undefined')
      clearTimeout(timeoutID);

    timeoutID = setTimeout(() => {
      enqueueBestmove(board.fenstring);
      // let expected = board.fenstring;
      // let actual = Analyzer.platform.scanBoard();
      // console.debug(`expected: ${expected}`);
      // console.debug(`actual  : ${actual}`);
      // console.debug(`valid   : ${expected.startsWith(actual)}`);
      // console.debug(board.fenstring);
      // console.debug(board.renderString());

      // let time = Analyzer.platform.getTime();
      // await port.sendCommand('setPosition', {
      //   fen: board.fenstring,
      // });
      // let {move} = await port.sendCommand('go', {
      //   depth: 10,
      //   wtime: time.w,
      //   btime: time.b,
      // });
      // console.log('best ' + move);
      // Analyzer.platform.markMove(move);
    }, 100);
  });

  if(typeof Analyzer.platform.removeAd === 'function')
    Analyzer.platform.removeAd();
})();
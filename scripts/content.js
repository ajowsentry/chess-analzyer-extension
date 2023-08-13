function beginScan() {
  const Analyzer = (() => {
    let platform = 'unknown', scanner = null;
    if (location.host.match(/^(?:www\.)chess\.com$/)) {
      platform = 'chess.com';
      scanner = window.chessAnalyzer.platforms.ChessCom;
    }
    else if (location.host.match(/^(?:www\.)lichess\.org$/)) {
      platform = 'lichess.org';
      scanner = window.chessAnalyzer.platforms.ChessCom;
    }
    
    return { platform, scanner };
  })();

  if (Analyzer.platform === 'unknown' || typeof Analyzer.scanner === 'undefined') {
    return;
  }

  let board, timeoutID;

  Analyzer.scanner.onInitializing(() => {
    board = new window.chessAnalyzer.Board();
  });

  Analyzer.scanner.onMoveAdded((move) => {
    let oMove = board.move(move);
    console.debug(`${move} -> ${oMove._from.key}${oMove._to.key}`);
    if(typeof timeoutID !== 'undefined')
      clearTimeout(timeoutID);

    timeoutID = setTimeout(() => {
      console.debug(board.fenstring)
    }, 100);
  });

  Analyzer.scanner.initialize();

  if(typeof Analyzer.scanner.removeAd === 'function')
    Analyzer.scanner.removeAd();
};

$(beginScan);
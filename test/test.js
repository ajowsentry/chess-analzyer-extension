const fs = require('fs');
const chess = require('../lib/chess.js');

var content = JSON.parse(fs.readFileSync(__dirname + '/pgn/test-2.json'));
let board = new chess.Board();
content.forEach(move => {
  // let move = item.notation;
  // board.move(move);
  // let fenstring = board.fenstring;
  // console.log(`move ${move}`);
  // if(fenstring != item.fenstring) {
  //     console.error(`expected -> ${item.fenstring}`);
  //     console.error(`actual   -> ${fenstring}`);
  // }
  console.log(move);
  try {
    board.move(move);
  }
  catch (err) {
    console.log(board.renderString());
    throw err;
  }
});
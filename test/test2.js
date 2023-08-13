const fs = require('fs');
const chess = require('../lib/chess.js');

var content = JSON.parse(fs.readFileSync(__dirname + '/pgn/placement-2.json'));
let board = new chess.Board();
let halfMove = 0
for(let item of content) {
  let prev = board.fenstring;
  let move = item.notation;
  board.move(move);
  let fenstring = board.fenstring;
  console.log(`${halfMove}. move ${move}`);
  if (!fenstring.startsWith(item.fenstring)) {
    console.error(`previous -> ${prev}`);
    console.error(`expected -> ${item.fenstring}`);
    console.error(`actual   -> ${fenstring}`);
    console.error();
    break;
  }
  halfMove++;
};
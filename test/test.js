const fs = require('fs');
const chess = require('./chess.js');

var content = JSON.parse(fs.readFileSync(__dirname + '/../test/pgn/test-1.json'));
let board = new chess.Board();
content.forEach(item => {
    let move = item.notation;
    board.move(move);
    let fenstring = board.fenstring;
    console.log(`move ${move}`);
    if(fenstring != item.fenstring) {
        console.error(`expected -> ${item.fenstring}`);
        console.error(`actual   -> ${fenstring}`);
    }
});
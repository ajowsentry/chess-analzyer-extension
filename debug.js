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

function scanMove() {
  let node = document.querySelector('.node.selected');
  let move = '';
  for(let n of node.childNodes) {
    if(n.nodeName == 'SPAN' && n.dataset.figurine)
      move += n.dataset.figurine;
    else if(n.nodeName == '#text')
      move += n.data;
  }
  return move;
}
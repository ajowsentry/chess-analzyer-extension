(function() {

  const FILES = {
    QR: 0,
    QN: 1,
    QB: 2,
    Q: 3,
    K: 4,
    KB: 5,
    KN: 6,
    KR: 7,
  }

  const RANKS = {
    BH: 0,
    WH: 7,
  };

  class Coordinate {
    /**
     * a to h
     * @type {string}
     */
    #file;

    /**
     * 1 to 8
     * @type {string}
     */
    #rank;

    /**
     * @type {number|null}
     */
    #id = null;

    /**
     * @type {string|null}
     */
    #key = null;

    /**
     * @type {Piece|null}
     */
    _piece = null;

    /**
     * @type {Board}
     */
    _board;

    /**
     * @returns {string}
     */
    get file() {
      return this.#file;
    }

    /**
     * @return {string}
     */
    get rank() {
      return this.#rank;
    }

    /**
     * @return {number}
     */
    get id() {
      return this.#id ??= 8 * (8 - this.#rank) + (this.#file.charCodeAt(0) - 97);
    }

    get key() {
      return this.#key ??= this.#file + this.#rank;
    }

    /**
     * @return {number}
     */
    get row() {
      return parseInt(this.id / 8);
    }

    /**
     * @return {number}
     */
    get column() {
      return this.id % 8;
    }

    /**
     * @return {Piece|null}
     */
    get piece() {
      return this._piece;
    }

    /**
     * @param {Piece} piece
     */
    bind(piece) {
      if(this._piece !== piece) {
        this.unbind();
        this._piece = piece;
        piece._position = this;
      }
    }

    unbind() {
      if(this._piece) {
        this._piece._position = null;
        this._piece = null;
      }
    }

    /**
     * @param {Board} board Board object
     * @param {string} coordinate Chess notation coordinate (`<file>` `<rank>`)
     */
    constructor(board, coordinate) {
      if(coordinate.length != 2 || 'a' > coordinate[0] || coordinate[0] > 'h' || '1' > coordinate[1] || coordinate[1] > '8') {
        throw new Error(`Invalid coordinate ${coordinate}`);
      }

      this._board = board;
      this.#file = coordinate[0];
      this.#rank = coordinate[1];
    }

    get threats() {
      return this._board._pieces.reduce((acc, p) => {
        if(p.availableMoves.includes(this))
          acc.push(p);
        return acc;
      }, []);
    }
  }

  class Piece {

    /**
     * Position
     * @type {Coordinate|null}
     */
    _position;

    /**
     * Black or white
     * @type {string}
     */
    _side;

    /**
     * One of R, N, B, Q, K, P, r, n, b, q, k, p
     * @type {string}
     */
    _symbol;

    /**
     * @type {Board}
     */
    _board;

    /**
     * @type {Piece | null}
     */
    pinningPiece = null;

    /**
     * @type {string}
     */
    get side() {
      return this._side;
    }

    /**
     * @type {string}
     */
    get symbol() {
      return this._symbol;
    }

    /**
     * @type {Coordinate|null}
     */
    get position() {
      return this._position;
    }

    /**
     * @param {Board} board
     * @param {string} side
     * @param {string} symbol
     */
    constructor(board, side, symbol) {
      if(this.constructor.name == 'Piece')
        throw new Error(`Abstract class ${this.constructor.name} cannot be instantiated`);
      this._board = board;
      this._side = side;
      this._symbol = side == 'b' ? symbol.toLowerCase() : symbol.toUpperCase();
    }

    static createFromSymbol(board, symbol) {
      if(!isValidPiece(symbol))
        throw new Error(`Invalid parameter. ${symbol} is not valid piece.`);

      let side = symbol === symbol.toLowerCase() ? 'b' : 'w';
      switch(symbol.toUpperCase()) {
        case 'P': return new Pawn(board, side);
        case 'R': return new Rook(board, side);
        case 'N': return new Knight(board, side);
        case 'B': return new Bishop(board, side);
        case 'Q': return new Queen(board, side);
        case 'K': return new King(board, side);
      }
    }

    /**
     * @param {Coordinate} position
     */
    bind(position) {
      if(position !== this._position) {
        this.unbind();
        position.bind(this);
      }
    }

    unbind() {
      if(this._position) {
        this._position.unbind();
      }
    }

    get oppositeSide() {
      return this.side == 'b' ? 'w' : 'b';
    }

    /**
     * @return {Coordinate[]}
     */
    get availableMoves() {
      return [];
    }
  }

  class Pawn extends Piece {
    constructor(board, side) {
      super(board, side, 'P');
    }

    get availableMoves() {
      if(!this.position)
        return [];

      let { _board: board, position, side } = this;

      let moves = [];
      let step = side == 'b' ? 1 : -1;

      moves.push(board.getCoordinate([position.row + step, position.column]));
      let firstStep = board.getCoordinate([position.row + step, position.column]);
      if(firstStep !== null && firstStep.piece === null) {
        moves.push(firstStep);
        if(position.row == 1 || position.row == 6) {
          let secondStep = board.getCoordinate([position.row + 2 * step, position.column]);
          if(secondStep !== null && secondStep.piece === null) moves.push(secondStep);
        }
      }

      let capturingPositions = [];

      let left = board.getCoordinate([position.row + step, position.column - 1]);
      let right = board.getCoordinate([position.row + step, position.column + 1]);

      if(left !== null && (left.piece?.side == this.oppositeSide || left == board._enPassant)) {
        capturingPositions.push(left);
      }
      
      if(right !== null && (right.piece?.side == this.oppositeSide || right == board._enPassant)) {
        capturingPositions.push(right);
      }

      if(this.pinningPiece !== null) {
        return capturingPositions.includes(this.pinningPiece.position) ? [this.pinningPiece.position] : [];
      }

      return [...moves, ...capturingPositions];
    }
  }

  class Knight extends Piece {
    constructor(board, side) {
      super(board, side, 'N');
    }

    get availableMoves() {
      let directions = [
        [2, 1], [-2, 1], [2, -1], [-2, -1],
        [1, 2], [-1, 2], [1, -2], [-1, -2],
      ];

      let moves = iterateMove(this, directions, 1);

      if(this.pinningPiece !== null) {
        return moves.includes(this.pinningPiece.position) ? [this.pinningPiece.position] : [];
      }

      return moves;
    }
  }

  class Bishop extends Piece {
    constructor(board, side) {
      super(board, side, 'B');
    }

    get availableMoves() {
      let moves = [];
      let directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for(let i = 1; i < 8; i++) {
        let steps = iterateMove(this, directions, i);
        if(steps.length == 0) break;
        moves.push(...steps);
      }

      if(this.pinningPiece !== null) {
        return moves.includes(this.pinningPiece.position) ? [this.pinningPiece.position] : [];
      }

      return moves;
    }
  }

  class Rook extends Piece {
    constructor(board, side) {
      super(board, side, 'R');
    }

    get availableMoves() {
      let moves = [];
      let directions = [[-1, 0], [0, -1], [1, 0], [0, 1]];
      for(let i = 1; i < 8; i++) {
        let steps = iterateMove(this, directions, i);
        if(steps.length == 0) break;
        moves.push(...steps);
      }

      if(this.pinningPiece !== null) {
        return moves.includes(this.pinningPiece.position) ? [this.pinningPiece.position] : [];
      }

      return moves;
    }
  }

  class Queen extends Piece {
    constructor(board, side) {
      super(board, side, 'Q');
    }

    get availableMoves() {
      let moves = [];
      let directions = [[-1, 0], [0, -1], [1, 0], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      for(let i = 1; i < 8; i++) {
        let steps = iterateMove(this, directions, i);
        if(steps.length == 0) break;
        moves.push(...steps);
      }

      if(this.pinningPiece !== null) {
        return moves.includes(this.pinningPiece.position) ? [this.pinningPiece.position] : [];
      }

      return moves;
    }
  }

  class King extends Piece {
    constructor(board, side) {
      super(board, side, 'K');
    }

    get availableMoves() {
      if(!this.position)
        return [];

      let directions = [
        [-1, 0], [0, -1], [1, 0], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ];
      
      let moves = iterateMove(this, directions, 1);

      const {_board: board, side, position} = this;

      let queenSide = board._castling[side == 'b' ? 'q' : 'Q'];
      if(queenSide) {
        let rook = board._pieces.find(
          p => p instanceof Rook
            && p.position
            && p.side == side
            && p.position.column < position.column
        );

        let isAbleToCastling = true;
        for(let i = position.column; i > rook.position.column; i--) {
          let pos = board.getCoordinate([position.row, i]);
          if(pos.piece !== null) {
            isAbleToCastling = false;
            break;
          }
        }

        if(isAbleToCastling)
          moves.push(board.getCoordinate([position.row, 2]));
      }

      let kingSide = board._castling[side == 'b' ? 'k' : 'K'];
      if(kingSide) {
        let rook = board._pieces.find(
          p => p instanceof Rook
            && p.position
            && p.side == side
            && p.position.column > position.column
        );

        let isAbleToCastling = true;
        for(let i = position.column; i < rook.position.column; i++) {
          let pos = board.getCoordinate([position.row, i]);
          if(pos.piece !== null) {
            isAbleToCastling = false;
            break;
          }
        }

        if(isAbleToCastling)
          moves.push(board.getCoordinate([position.row, 6]));
      }

      return moves;
    }
  }

  class Castling {
    /**
     * @type {'K' | 'Q'}
     */
    #side;

    /**
     * @type {Rook}
     */
    #rook;

    /**
     * @type {King}
     */
    #king;

    /**
     * @param {Board} board 
     * @param {string} notation 
     */
    constructor(board, notation) {
      this.#side = notation == 'O-O-O' ? 'Q' : 'K';

      this.#king = board._pieces.find(
        p => p instanceof King
          && p.position !== null
          && p.side == board._turns
      );
      
      let toRank = board._turns == 'b' ? '8' : '1';
      this.#rook = board._pieces.find(
        p => p instanceof Rook
          && p.position !== null
          && p.side == board._turns
          && p.position.rank == toRank
          && (
            this.#side == 'Q'
              ? p.position.column < this.#king.position.column
              : p.position.column > this.#king.position.column
          )
      );
    }

    get side() {
      return this.#side;
    }

    get rook() {
      return this.#rook;
    }

    get king() {
      return this.#king;
    }
  }

  class Move {

    /**
     * @type {'b' | 'w'}
     */
    #turns;

    /**
     * @type {Coordinate}
     */
    #from;

    /**
     * @type {Coordinate}
     */
    #to;

    /**
     * @type {Piece}
     */
    #piece;

    /**
     * @type {Piece|null}
     */
    #capturedPiece = null;

    /**
     * @type {boolean}
     */
    #isEnPassant = false;

    /**
     * @type {Piece|null}
     */
    #promotesTo = null;

    /**
     * @type {Castling|null}
     */
    #castling = null;

    /**
     * @type {'+' | '#' | null}
     */
    #checkState = null;

    /**
     * @type {string}
     */
    #notation;

    get turns() {
      return this.#turns;
    }

    get from() {
      return this.#from;
    }

    get to() {
      return this.#to;
    }

    get piece() {
      return this.#piece;
    }

    get capturedPiece() {
      return this.#capturedPiece;
    }

    get isEnPassant() {
      return this.#isEnPassant;
    }

    get promotesTo() {
      return this.#promotesTo;
    }

    get castling() {
      return this.#castling;
    }

    get checkState() {
      return this.#checkState;
    }

    get notation() {
      return this.#notation;
    }

    /**
     * @param {Board} board 
     * @param {string} notation 
     */
    constructor(board, notation) {

      this.#notation = notation;
      this.#turns = board._turns;

      if('+#'.includes(notation[notation.length - 1])) {
        this.#checkState = notation[notation.length - 1];
        notation = notation.substring(0, notation.length - 1);
      }

      if(notation.includes('-')) {
        notation = notation.replaceAll('0', 'O').toUpperCase();
        if(notation != 'O-O-O' && notation != 'O-O') {
          throw new Error(`Unable to process notation ${this.#notation}`);
        }

        let castling = new Castling(board, notation);
        this.#piece = castling.king;
        this.#from = castling.king.position;
        this.#to = board.getCoordinate([castling.king.position.row, castling.side == 'K' ? FILES.KN : FILES.QB]);
        this.#castling = castling;
        return;
      }

      let promotesTo = null;
      if(notation[notation.length - 2] == '=') {
        promotesTo = notation[notation.length - 1];
        notation = notation.substring(0, notation.length - 2);
      }

      this.#to = board.getCoordinate(notation.substring(notation.length - 2));
      notation = notation.substring(0, notation.length - 2);

      let isCapturing = false;
      if(notation[notation.length - 1] == 'x') {
        this.#capturedPiece = this.#to.piece;
        isCapturing = true;
        notation = notation.substring(0, notation.length - 1);
      }

      let sourcePiece = Pawn;
      if(!this._isCastling && isValidPiece(notation[0])) {
        switch(notation[0]) {
          case 'R': sourcePiece = Rook; break;
          case 'N': sourcePiece = Knight; break;
          case 'B': sourcePiece = Bishop; break;
          case 'Q': sourcePiece = Queen; break;
          case 'K': sourcePiece = King; break;
        }

        notation = notation.substring(1);
      }

      let from = null;
      if(notation.length == 2) {
        from = board.getCoordinate(notation);
      }
      else if(notation.length <= 1) {
        let rank = '1' <= notation && notation <= '8' ? notation : null;
        let file = 'a' <= notation && notation <= 'h' ? notation : null;
        from = board._coordinates.find(
          c => c.piece instanceof sourcePiece
            && c.piece.side == this.#turns
            && (file === null || c.file == file)
            && (rank === null || c.rank == rank)
            && c.piece.availableMoves.includes(this.#to)
        );

        // if(this.#notation == 'c5') {
        //   console.log('DEBUG', froms.map(f => f.piece).map(p => `${p.symbol} -> ${p.availableMoves.map(m => m.key).join()}`));
        //   // console.log('DEBUG', froms[0] === froms[1]);
        // }

        // from = froms[0];
      }

      if(from === null) {
        throw new Error(`Unable to get piece from move ${this.#notation}`);
      }

      this.#from = from;
      this.#piece = from.piece;
      if(isCapturing) {
        if(this.#to.piece === null && from.piece instanceof Pawn) {
          // En passant
          let square = this.#to.file + (this.#turns == 'b' ? '4' : '5');
          this.#capturedPiece = board.getCoordinate(square).piece;
          this.#isEnPassant = true;
        }
        else this.#capturedPiece = this.#to.piece;
      }

      if(promotesTo !== null) {
        this.#promotesTo = Piece.createFromSymbol(
          board, this.#turns === 'b'
            ? promotesTo.toLowerCase()
            : promotesTo.toUpperCase()
        );
      }
    }
  }

  /**
   * @param {Piece} piece
   * @param {number[][]} directions 
   * @param {number} distance 
   * @returns {Coordinate[]}
   */
  function iterateMove(piece, directions, distance) {
    let moves = [];
    const { _board: board, position, oppositeSide } = piece;

    if(position === null)
      return moves;

    for(let [d, v] of directions.entries()) {
      if(v !== null) {
        let pos = board.getCoordinate([position.row + distance * v[0], position.column + distance * v[1]]);
        if(pos === null || pos.piece !== null) {
          directions[d] = null;
        }

        if(pos && (pos.piece === null || pos.piece.side === oppositeSide)) {
          moves.push(pos);
        }
      }
    }
    return moves;
  }

  /**
   * @param {King} king 
   */
  function setPinningPiece(king) {
    let directions = [
      [0, 1, true, null], [0, -1, true, null], [1, 0, true, null], [-1, 0, true, null],
      [1, 1, false, null], [1, -1, false, null], [-1, 1, false, null], [-1, -1, false, null],
    ];

    const { _board: board, position, side } = king;
    for(let distance = 1; distance < 8; distance++)
    for(let [d, v] of directions.entries()) {
      if(v !== null) {
        let [y, x, straight, pinned] = v;
        let pos = board.getCoordinate([position.row + distance * y, position.column + distance * x]);
        if(pos === null) {
          directions[d] = null;
        }
        else if(pos.piece !== null) {
          let piece = pos.piece;
          if(pinned == null && piece.side == side) {
            directions[d][3] = piece;
          }
          else if(pinned != null && piece.side != side) {
            if(piece instanceof Queen) {
              pinned.pinningPiece = piece;
            }
            else if(straight && piece instanceof Rook) {
              pinned.pinningPiece = piece;
            }
            else if(!straight && piece instanceof Bishop) {
              pinned.pinningPiece = piece;
            }
            else {
              directions[d] = null;
            }
          }
          else {
            directions[d] = null;
          }
        }
      }
    }
  }

  function isValidPosition(position) {
    return !!position.match(/^[a-h][1-8]$/);
  }

  function isValidPiece(piece) {
    return 'rnbqkpRNBQKP'.includes(piece);
  }

  class Board {

    /**
     * Pieces placement in fenstring format
     * @type {string}
     */
    #placement;

    /**
     * Turns (Black or White)
     * @type {string}
     */
    _turns = 'w';

    /**
     * Castling availability
     * @type {object}
     */
    _castling = { K: false, Q: false, k: false, q: false };

    /**
     * En passant availability
     * @type {Coordinate|null}
     */
    _enPassant = null;
    
    /**
     * @type {number}
     */
    _halfmove = 0;

    /**
     * @type {number}
     */
    _fullmove = 1;

    /**
     * Coordinates
     * @type {Coordinate[]}
     */
    _coordinates = [];

    /**
     * Coordinates
     * @type {Piece[]}
     */
    _pieces = [];

    /**
     * Moves
     * @type {Move[]}
     */
    _moves = [];

    /**
     * @type {boolean}
     */
    _changed = false;

    /**
     * @param {string|number[]} key
     * @returns {Coordinate|null}
     */
    getCoordinate(key) {
      if(key === null) {
        return null;
      }
      else if(Array.isArray(key)) {
        if(!(0 <= key[0] && key[0] < 8 && 0 <= key[1] && key[1] < 8)) {
          return null;
        }

        return this._coordinates[key[1] + key[0] * 8];
      }
      else if(!isValidPosition(key)) {
        throw new Error(`Invalid position ${key}`);
      }

      return this._coordinates.find(q => q.key == key);
    }

    changeTurns() {
      this._turns = this._turns == 'b' ? 'w' : 'b';
    }

    get coordinates() {
      return [...this._coordinates];
    }

    constructor(startPosition) {
      const errorMessage = new Error(`Invalid parameter. startPosition "${startPosition}" is not a valid fenstring`);
      
      if(typeof startPosition === 'undefined') {
        startPosition = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      }
      else if(typeof startPosition === 'string') {
        startPosition = startPosition.split(' ').filter(s => s.length > 0);
        if(startPosition.length != 6) {
          throw errorMessage;
        }
        startPosition = startPosition.join(' ');
      }
      else {
        throw errorMessage;
      }

      let [_placement, _turns, _castling, _enPassant, _halfmove, _fullmove] = startPosition.split(' ');

      _turns = _turns.toLowerCase();
      if(!'bw'.includes(_turns)) {
        throw errorMessage;
      }

      if(!_castling.match(/^(?:-|[KQkq]{1,4})$/)) {
        throw errorMessage;
      }

      _castling = [...'KQkq'].reduce((o, c) => ({[c]: _castling.includes(c), ...o}), { });

      if(_enPassant == '-') {
        _enPassant = null;
      }
      else if(!isValidPosition(_enPassant)) {
        throw errorMessage;
      }

      '87654321'.split('').forEach(
        r => 'abcdefgh'.split('').forEach(
          f => this._coordinates.push(new Coordinate(this, f + r))
        )
      );

      let _rows = _placement.split('/');
      if(_rows.length != 8) {
        throw errorMessage;
      }

      for(let r = 0; r < 8; r++) {
        let row = _rows[r];
        let index = 0;
        row.split('').forEach(c => {
          if(isValidPiece(c) && index < 8) {
            let piece = Piece.createFromSymbol(this, c);
            this.getCoordinate([r, index++]).bind(piece);
            this._pieces.push(piece);
            return;
          }
          let blanks = parseInt(c);
          if(1 <= blanks && blanks <= 8) {
            index += blanks;
            return;
          }
          throw errorMessage;
        });
      }

      _halfmove = parseInt(_halfmove);
      _fullmove = parseInt(_fullmove);
      if(isNaN(_halfmove) || _halfmove < 0 || isNaN(_fullmove) || _fullmove < 0) {
        throw errorMessage;
      }

      this.#placement = _placement;
      this._turns = _turns;
      this._castling = _castling;
      this._enPassant = this.getCoordinate(_enPassant);
      this._halfmove = _halfmove;
      this._fullmove = _fullmove;
    }

    fromPieces(pieces) {
      let startPosition = `${pieces.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${pieces.toUpperCase()} w KQkq - 0 1`;
      return new Board(startPosition);
    }

    get fenstring() {
      if (this._changed) {
        let placement = this._coordinates.reduce((s, c) => s += c.piece?.symbol ?? '1', '').match(/.{8}/g).join('/');
        for(let n = 8; n >= 2; n--) {
          placement = placement.replaceAll('1'.repeat(n), n)
        };
        this.#placement = placement;
        this._changed = false;
      }

      let castling = [...'KQkq'].reduce((acc, c) => acc += this._castling[c] ? c : '', '');
      castling = castling.length > 0 ? castling : '-';

      return `${this.#placement} ${this._turns} ${castling} ${this._enPassant?.key ?? '-'} ${this._halfmove} ${this._fullmove}`;
    }

    findKing(side) {
      return this._pieces.find(p => p.position && p.side == side && p instanceof King);
    }

    move(moveString) {
      this._pieces.forEach(p => p.pinningPiece = null);
      setPinningPiece(this.findKing('b'));
      setPinningPiece(this.findKing('w'));
      let move = new Move(this, moveString);

      if(move.capturedPiece !== null) {
        move.capturedPiece.unbind();
      }

      move.from.unbind();
      move.to.bind(move.promotesTo ?? move.piece);
      
      if(move.castling !== null) {
        let rook = move.castling.rook;
        rook.unbind();

        let newPos = this.getCoordinate([
          this._turns == 'b' ? 0 : 7,
          move.castling.side == 'K' ? FILES.KB : FILES.Q
        ]);

        rook.bind(newPos);
      }
      
      if(this._turns == 'b') {
        this._fullmove++;
      }

      if(move.capturedPiece !== null || move.piece instanceof Pawn) {
        this._halfmove = 0;
      }
      else {
        this._halfmove++;
      }

      let unsetCastling = '';
      this._enPassant = null;
      if(move.piece instanceof King) {
        unsetCastling = 'kq';
      }
      else if(move.piece instanceof Rook) {
        let king = this._pieces.find(p => p.position && p instanceof King && p.side == this._turns);
        let rook = move.piece;
        unsetCastling = rook.position.file > king.file ? 'k' : 'q';
      }
      else if(move.piece instanceof Pawn) {
        if(move.from.rank == '2' && move.to.rank == '4') {
          this._enPassant = this.getCoordinate(move.from.file + '3');
        }
        else if(move.from.rank == '7' && move.to.rank == '5') {
          this._enPassant = this.getCoordinate(move.from.file + '6');
        }
      }

      if(unsetCastling.length > 0) {
        unsetCastling = this._turns == 'b' ? unsetCastling.toLowerCase() : unsetCastling.toUpperCase();
        [...unsetCastling].forEach(v => this._castling[v] = false);
      }

      this.changeTurns();
      this._changed = true;

      this._moves.push(move);

      return move;
    }

    renderString() {
      let boardString = "╔═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╗\n"
        + "║ a8 │ b8 │ c8 │ d8 │ e8 │ f8 │ g8 │ h8 ║ 8\n"
        + "╟───┼───┼───┼───┼───┼───┼───┼───╢\n"
        + "║ a7 │ b7 │ c7 │ d7 │ e7 │ f7 │ g7 │ h7 ║ 7\n"
        + "╟───┼───┼───┼───┼───┼───┼───┼───╢\n"
        + "║ a6 │ b6 │ c6 │ d6 │ e6 │ f6 │ g6 │ h6 ║ 6\n"
        + "╟───┼───┼───┼───┼───┼───┼───┼───╢\n"
        + "║ a5 │ b5 │ c5 │ d5 │ e5 │ f5 │ g5 │ h5 ║ 5\n"
        + "╟───┼───┼───┼───┼───┼───┼───┼───╢\n"
        + "║ a4 │ b4 │ c4 │ d4 │ e4 │ f4 │ g4 │ h4 ║ 4\n"
        + "╟───┼───┼───┼───┼───┼───┼───┼───╢\n"
        + "║ a3 │ b3 │ c3 │ d3 │ e3 │ f3 │ g3 │ h3 ║ 3\n"
        + "╟───┼───┼───┼───┼───┼───┼───┼───╢\n"
        + "║ a2 │ b2 │ c2 │ d2 │ e2 │ f2 │ g2 │ h2 ║ 2\n"
        + "╟───┼───┼───┼───┼───┼───┼───┼───╢\n"
        + "║ a1 │ b1 │ c1 │ d1 │ e1 │ f1 │ g1 │ h1 ║ 1\n"
        + "╚═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╝\n"
        + "  A   B   C   D   E   F   G   H";

      this.coordinates.forEach(c => {
        boardString = boardString.replace(c.key, c.piece?.symbol ?? ' ');
      });
      return boardString;
    }
  }
  
  if(typeof module !== 'undefined')
    module.exports = { Board };

  if(typeof window !== 'undefined') {
    
    if(typeof window.chessAnalyzer === 'undefined')
      window.chessAnalyzer = { };

    if(typeof window.chessAnalyzer.Board === 'undefined')
      window.chessAnalyzer.Board = Board;
  }
})();
class BoardProxy {
  constructor(board) {
    Object.assign(this, board);
  }
}

module.exports = {
  BoardProxy: BoardProxy,
}
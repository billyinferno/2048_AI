document.addEventListener("DOMContentLoaded", function() {
   // we need to wait until the browser is finished loading the DOM
   // so we can handle the event listener for the keypress
   window.requestAnimationFrame(function() {
      var game = new Game2048(KeyboardInputManager, GameRenderer);
   });
});

function Game2048(InputManager, Renderer) {
   // set the Input Manager and Actuator that we will use
   this.InputManager = new InputManager();
   this.Renderer     = new Renderer();

   // bind the move and restart function of the game.
   this.InputManager.on("move", this.move.bind(this));
   this.InputManager.on("restart", this.restart.bind(this));
   this.InputManager.on("stepAI", this.stepAI.bind(this));
   this.InputManager.on("runAI", this.runAI.bind(this));
   this.InputManager.on("pauseAI", this.pauseAI.bind(this));

   // setup the game
   this.setup();
}

Game2048.prototype.setup = function() {
   // setup the game for the first time
   
   // create the Grid that will be used to contain all the tiles
   this.grid = new Grid();

   // initialize the score and the die and win indicator.
   this.score = 0;
   this.die   = false;
   this.won   = false;
   this.run   = false;

   // create the MonteCarlo AI
   this.AI = new MonteCarloTreeSearch(100, this.score, this.grid, this.Renderer, this.InputManager);

   // add 2 initial tiles to the grid.
   this.addRandomTile();
   this.addRandomTile();

   // this.grid.insertTile(new Tile(3,0,4));
   // this.grid.insertTile(new Tile(3,1,4));
   // this.grid.insertTile(new Tile(3,2,4));
   // this.grid.insertTile(new Tile(3,3,4));
   // this.grid.insertTile(new Tile(2,0,8));
   // this.grid.insertTile(new Tile(0,3,2));

   // render the game
   this.render();
}

Game2048.prototype.move = function(dir) {
   // move the block as per direction.
   // for this we can call the grid function for movement, so later when
   // implementing the AI, we can do it without the game manager, since
   // AI doesn't need complex function such as input binding, render, etc.
   var metadata = this.grid.move(dir);

   // after move, ensure that we still have move to be performed.
   this.die = this.isDie();
   if(!this.die) {
      // check whether we got a move or not?
      if(metadata && metadata.moved) {
         // add the score
         this.score += metadata.score;
         // add new random tile
         this.addRandomTile();
         // render the board again
         this.render();
      }
   }
   else {
      console.log("No more move, die already!");
   }
}

Game2048.prototype.restart = function() {
   // restart the game
   this.setup();
   // clear the message from the screen
   this.Renderer.clearMessage();
}

Game2048.prototype.stepAI = function() {
   this.AI.stepAI();
}

Game2048.prototype.runAI = function() {
   // if run is false, then run it again
   if(!this.run) {
      // run the program
      this.run = true;
      // set the paused and die in the MonteCarloSearch into false
      this.AI.setDie(false);
      // process the AI loop
      this.processAI();
   }
}

Game2048.prototype.pauseAI = function() {
   // check whether it's running or not?
   // if yes, set this as false
   if(this.run) {
      this.run = false;
   }
}

Game2048.prototype.processAI = function() {
   var self = this;

   // step AI, to get the best move
   self.AI.stepAI();
   var timeout = 50;

   // check whether we still run and not die?
   if(self.run && !self.AI.getDie()) {
      setTimeout(function () {
         self.processAI();
      }, timeout);
   }
}

Game2048.prototype.addRandomTile = function() {
   // first check whether we have cells available
   if(this.grid.getAvailableCells) {
      // there are available cells that we can fill on the grid.
      // generate the random value that we will put on the box, and get
      // random location that we will use to insert the tile.
      var value = Math.random() < 0.9 ? 2 : 4;
      var tile_position = this.grid.randomAvailableCells();
      var tile = new Tile(tile_position.row, tile_position.col, value);

      // insert the tile to the grid
      this.grid.insertTile(tile);
   }
}

Game2048.prototype.render = function() {
   // render the game
   this.Renderer.render(this.grid, {score : this.score, die: this.die, won: this.won});
}

Game2048.prototype.isDie = function() {
   // check whether we have moves available for all direction
   return !(this.grid.moveAvailable(0) || this.grid.moveAvailable(1) ||
            this.grid.moveAvailable(2) || this.grid.moveAvailable(3));
}


function Grid() {
   // create the tiles array that will contain all the tile function.
   this.tiles = [];
   this.addedScore = 0;

   // generate the tiles of the grid
   for(var row = 0; row < 4; row++) {
      // create 2d array for the tiles
      this.tiles[row] = [];
      for(var col = 0; col < 4; col++) {
         // push null value to the tiles, to ensure that there are no
         // garbage data currently being push to the tiles.
         this.tiles[row][col] = null;
      }
   }
}

Grid.prototype.clone = function() {
   var self = this;
   var NewGrid = new Grid();

   // copy all the tiles from current grid to new grid
   for(var row = 0; row < 4; row++) {
      for(var col = 0; col < 4; col++) {
         // push null value to the tiles, to ensure that there are no
         // garbage data currently being push to the tiles.
         if(self.tiles[row][col]) {
            var tiles = new Tile(row, col, self.tiles[row][col].value);
            NewGrid.insertTile(tiles);
         }
      }
   }

   return NewGrid;
}

Grid.prototype.insertTile = function(tile) {
   // insert tile to the Grid
   this.tiles[tile.row][tile.col] = tile;
}

Grid.prototype.removeTile = function(tile) {
   // removbe the tile from the Grid
   this.tiles[tile.row][tile.col] = null;
}

Grid.prototype.randomAvailableCells = function() {
   // first get all the available cells
   var availableCells = this.getAvailableCells();

   // check whether there are empty cells or not?
   if(availableCells.length) {
      return availableCells[Math.floor(Math.random() * availableCells.length)];
   }
}

Grid.prototype.getAvailableCells = function() {
   // create the cells array
   var cells = [];

   // loop through all the tiles to check whether there are any null
   // value on the tiles or not?
   for(var row = 0; row < 4; row++) {
      for(var col = 0; col < 4; col++) {
         if(this.tiles[row][col] === null) {
            // push the cell locations
            cells.push({row: row, col: col});
         }
      }
   }

   // once finished, we can return it to the caller proc
   return cells;
}

Grid.prototype.isCellsAvailble = function() {
   return this.getAvailableCells().length;
}

Grid.prototype.moveTile = function(old_pos, new_pos) {
   var new_tile = this.tiles[old_pos.row][old_pos.col];

   new_tile.row = new_pos.row;
   new_tile.col = new_pos.col;

   this.tiles[old_pos.row][old_pos.col] = null;
   this.tiles[new_pos.row][new_pos.col] = new_tile;

   // return this as reference to the new tile
   return new_tile;
}

Grid.prototype.move = function(direction) {
   var self = this;

   var current_tile, current_location;
   var next_tile, next_location;
   var score = 0;
   var moved = false;

   // move the cells to the desired direction.
   // first, check whether we have moveAvailable or not for this direction?
   if (this.moveAvailable(direction)) {
      // here we need to set all tiles indicator into false, and save previous position
      this.saveTilesIndicator();

      // get the offset for this direction
      var offset     = this.getOffset(direction);
      var traversals = this.buildTraversals(offset);

      traversals.row.forEach(function(row) {
         traversals.col.forEach(function(col) {
            // store current location, so we can get the correct
            current_location = { row: row, col: col };
            current_tile = self.getCellContent(current_location);

            // check whether this is tiles or not?
            if(current_tile) {
               // this is a tiles.
               // now get the next location of this tiles
               next_location = self.findNextLocation(current_location, offset);
               next_tile     = self.getCellContent(next_location.next);

               // ensure that the next location is a tiles or not?
               if(next_tile) {
                  // check whether this is the same tile or not?
                  // if not same tile, then check whether the value is the same or not?
                  if ((!(current_tile.row === next_tile.row && current_tile.col === next_tile.col)) && 
                      (current_tile.value === next_tile.value && !next_tile.mergeWithOtherTile)) {
                     // tile is same value, so we can merge this
                     var merged_tile = new Tile(next_tile.row,next_tile.col,(next_tile.value * 2));
                     merged_tile.mergeWithOtherTile = true;

                     // insert the tile to the grid, and remove current tile since we
                     // already merged it to new tile.
                     self.insertTile(merged_tile);
                     self.removeTile(current_tile);

                     // add the score on the joined tiles
                     score += merged_tile.value;
                  }
                  else {
                     // tile value is not the same, move it beside the tile
                     next_tile = self.moveTile(current_location, next_location.farthest);
                  }
               }
               else {
                  // no tiles found for this direction, move to the farthest
                  next_tile = self.moveTile(current_location, next_location.farthest);
               }

               // now check whether the current and next location is the same
               // or not? if not the same it means that we moved the tiles to other
               // location.
               if (!moved) {
                  if (self.isTileMoved(current_tile, next_tile)) {
                     moved = true;
                  }
               }
            }
         });
      });
//    console.log("Move to : " + direction);

      // return the score to the caller
      this.addedScore = score;
      return {moved: moved, score: score};
   }
// else {
//    console.log("No move available for direction : " + direction);
// }
   this.addedScore = score;
   return null;
}

Grid.prototype.isTileMoved = function(current_tile, next_tile) {
   if (current_tile && next_tile) {
      return (current_tile.row === next_tile.row && current_tile.col === next_tile.col);
   }
   else {
      return null;
   }
}

Grid.prototype.getCellContent = function(position) {
   // check whether this is within bounds or not?
   if(this.withinBounds(position)) {
      // check whether this is a tiles or not?
      if(this.tiles[position.row][position.col]) {
         // this is a tiles
         return this.tiles[position.row][position.col];
      }
      else {
         // not a tiles
         return null;
      }
   }
   else {
      // this is outside of the grid bounds, so return null to the caller
      return null;
   }
}

Grid.prototype.findNextLocation = function(position, offset) {
   var previous;
   do {
      // save current position to previous position
      previous = position;
      // get the next position based on the offset
      position = {row: previous.row + offset.row, col: previous.col + offset.col};
   } while(this.withinBounds(position) && this.cellEmpty(position));

   // once finished then return the next position value
   return { farthest: previous, next: position };
}

Grid.prototype.cellEmpty = function(position) {
   if(this.getCellContent(position)) {
      return false;
   }
   return true;
}

Grid.prototype.buildTraversals = function(offset) {
   var traversals = { row:[], col:[] };

   for(var i = 0; i < 4; i++) {
      traversals.row.push(i);
      traversals.col.push(i);
   }

   // now check whether the offset of the direction is less than 0, if yes then
   // it means we need to reverse the direction of the traversals.
   if (offset.row === 1) traversals.row = traversals.row.reverse();
   if (offset.col === 1) traversals.col = traversals.col.reverse();

   // return the traversals value to the caller
   return traversals;
}

Grid.prototype.getOffset = function(direction) {
   // get the correct offset whether that we need to traverse from lower bounds index,
   // to upper bounds index, or need to do it in reverse.
   var offset = {
      0: {col:  0, row:-1}, // move up
      1: {col:  1, row: 0}, // move right
      2: {col:  0, row: 1}, // move down
      3: {col: -1, row: 0}  // move left
   };

   return offset[direction];
}

Grid.prototype.saveTilesIndicator = function() {
   for(var row = 0; row < 4; row++) {
      for(var col = 0; col < 4; col++) {
         if(this.tiles[row][col]) {
            this.tiles[row][col].savePosition();
         }
      }
   }
}

Grid.prototype.moveAvailable = function(direction) {
   return this.spaceAvailable(direction) || this.sameTileAvailable(direction);
}

Grid.prototype.spaceAvailable = function(direction) {
   // check whether the move to this direction is available or not?
   // we can check it by check whether there are empty space on the
   // neighboor of the cells?
   for(var row = 0; row < 4; row++) {
      for(var col = 0; col < 4; col++) {
         if(this.tiles[row][col]) {
            // this is an active tile, check whether for this direction
            // the neighboor is empty or not?
            if(this.checkNeighboor(this.tiles[row][col], direction)) {
               // we can move to this location, so move is available
               return true;
            }
         }
      }
   }

   // if we reaching here, it means that there are no move available
   // for this direction.
   return false;
}

Grid.prototype.sameTileAvailable = function(direction) {
   // for checking the same tile available, we need to check what is
   // the furthest distance that we can cover for each tiles based on the direction.
   var offset = this.getOffset(direction);
   
   // now loop through all row and column
   for(var row = 0; row < 4; row++) {
      for(var col = 0; col < 4; col++) {
         var position = {row: row, col: col};
         var current_tile = this.getCellContent(position);
         if(current_tile) {
            // check the furthest tile from this tile
            var next_position = this.findNextLocation(position, offset);
            var next_tile = this.getCellContent(next_position.next);
            if(next_tile) {
               // we found another tile, check whether this tale is the same or not?
               if(!(current_tile.row === next_tile.row && current_tile.col === next_tile.col)) {
                  // the current and next tile is a different tile, check whether these tile
                  // have same value or not?
                  if(current_tile.value === next_tile.value) {
                     return true;
                  }
               }
            }
         }
      }
   }

   // if we reach here, it means that there are no same tiles available for
   // this direction.
   return false;
}

Grid.prototype.getNeighboorPosition = function(tile, direction) {
   var x, y;

   switch(direction) {
      case 0: // move up
         col = tile.col;
         row = tile.row - 1;
         break;
      case 1: // move right
         col = tile.col + 1;
         row = tile.row;
         break;
      case 2: // move down
         col = tile.col;
         row = tile.row + 1;
         break;
      case 3: // move left
         col = tile.col - 1;
         row = tile.row;
         break;
   }

   return {col: col, row: row};
}

Grid.prototype.checkNeighboor = function(tile, direction) {
   var self = this;

   // check whether the neighboor of the tiles is empty or not?
   var location = this.getNeighboorPosition(tile, direction);
   
   // check whether x, and y is withing boundary or not?
   if (this.withinBounds(location)) {
      // it's within the boundary of the grid, check whether this location
      // is empty or not?
      if(this.tiles[location.row][location.col]) {
         return false;
      }
      else {
         return true;
      }
   }

   // if we reach here, it means that the boundary checking is wrong
   // return false.
   return false;
}

Grid.prototype.withinBounds = function(position) {
   return ((position.col >= 0 && position.col <= 3) && (position.row >= 0 && position.row <= 3));
}

Grid.prototype.toString = function() {
   string = "";
   for(var row = 0; row < 4; row ++) {
      for(var col = 0; col < 4; col ++) {
         // print the board
         // TODO:
      }
   }
}

function Tile(row, col, value) {
   // set the tile location
   this.row = row;
   this.col = col;

   // set the tile value
   this.value = value;

   // track the previous and whether this is already merge with other
   // tiles or not?
   this.previousPosition    = null;
   this.mergeWithOtherTile  = false; // defaulted to false when firstly created
}

Tile.prototype.savePosition = function() {
   this.previousPosition   = {row: this.row, col: this.col};
   this.mergeWithOtherTile = false;
}

Tile.prototype.clone = function() {
   var self = this;
   var newTile = new Tile(self.row, self.col, self.value);
   return newTile;
}

function KeyboardInputManager() {
   // create the event queue for all the keyboard input.
   this.GameEvents = {};

   // listen to the keypress
   this.listen();
}

KeyboardInputManager.prototype.on = function(event, callback) {
   // here we will registered the callback function for each events,
   // so later we can call the correct callback function when it was
   // triggered by the keyboard input.
   if(!this.GameEvents[event]) {
      this.GameEvents[event] = [];
   }

   // push the callback of the this events queue
   this.GameEvents[event].push(callback);
}

KeyboardInputManager.prototype.register = function(event, data) {
   var callbacks = this.GameEvents[event];
   if (callbacks) {
      callbacks.forEach(function(callback) {
         callback(data);
      });
   }
}

KeyboardInputManager.prototype.addCommand = function(move) {
   var self = this;

   // ensure that the move is correct move before we add it to the event queue
   if (move >= 0 && move <= 3) {
      self.register("moveAI", move);
   }
}

KeyboardInputManager.prototype.listen = function() {
   var self = this;
   var map = {
      38: 0, // up
      39: 1, // right
      40: 2, // down
      37: 3  // left
   };

   // add the keydown listener to knew everytime the keyboard is pressed
   document.addEventListener("keydown", function(event) {
      var modifier  = event.altKey || event.ctrlKey || event.shiftKey || event.metaKey;
      var is_mapped = map[event.which];

      // check whether we press modifier or not?
      if (!modifier) {
         // no modifier is pressed, then we can check whether we actually
         // can map it or not?
         if (is_mapped !== undefined) {
            // do not trigger default event of this (such as scrolling the web page, etc.)
            event.preventDefault();
            // register the events so we can call it from the game manager
            self.register("move", is_mapped);
         }
         else {
            // check whether this is R or not?
            // if yes, then restart the game.
            if (event.which === 82) {
               console.log("restart the game");
               event.preventDefault();
               self.register("restart");
            }

            // check whether we want to start the AI
            if (event.which === 65) {
               console.log("AI process started");
               event.preventDefault();
               self.register("runAI");
            }

            // check whether we want to pause the AI
            if (event.which === 80) {
               console.log("AI process paused");
               event.preventDefault();
               self.register("pauseAI");
            }

            // check whether we want to step the AI
            if (event.which === 83) {
               event.preventDefault();
               self.register("stepAI");
            }
         }
      }
   });
}

function GameRenderer() {
   // set the container of the tiles
   this.tilesContainer = document.getElementById("tile_container");
   this.scoreContainer = document.getElementById("current_score");
   this.addedContainer = document.getElementById("added_score");

   // indicator to check whether render is finished or not?
   this.isRenderFinished = true;
}

GameRenderer.prototype.checkIsRender = function() {
   return this.isRenderFinished;
}

GameRenderer.prototype.render = function(grid, metadata) {
   var self = this;

   self.isRenderFinished = false;
   window.requestAnimationFrame(function() {
      self.clearContainer(self.tilesContainer);

      // loop for each grid
      for(var row=0; row<4; row++) {
         for(var col=0; col<4; col++) {
            // check whether we need to add this grid to the tiles container
            // or not?
            if (grid.tiles[row][col]) {
               // add the tiles of this data
               self.addTile(grid.tiles[row][col]);
            }
         }
      }

      // update the score
      self.updateScore(metadata.score, grid.addedScore);
      self.isRenderFinished = true;
   });
}

GameRenderer.prototype.addTile = function(tile) {
   var self = this;
   var position = tile.previousPosition || {row: tile.row, col: tile.col};

   // create div element that we will put on the tile container.
   var element = document.createElement("div");
   var classes = ["block", "block-" + position.row + "-" + position.col, "block-value-" + tile.value];
   this.applyClass(element, classes);
   element.textContent = tile.value;

   // animate the tiles from current position to the next position
   // check whether this tile is moved
   if(tile.previousPosition) {
      // perform animation from previous class to this class
      window.requestAnimationFrame(function () {
         classes[1] = "block-" + tile.row + "-" + tile.col;
         self.applyClass(element, classes);
      });
   }
   else if(tile.mergeWithOtherTile) {
      // no need to perform anything for merge block
   }
   else {
      // this is a new tile
      classes.push("block-new");
      this.applyClass(element, classes);
   }

   // put the tiles on the container
   self.tilesContainer.appendChild(element);
}

GameRenderer.prototype.clearContainer = function(container) {
   // clear the container from the tiles
   while(container.firstChild) {
      container.removeChild(container.firstChild);
   }
}

GameRenderer.prototype.applyClass = function(element, classes) {
   element.setAttribute("class", classes.join(" "));
}

GameRenderer.prototype.updateScore = function(score, addedScore) {
   this.scoreContainer.textContent = score;
   if(addedScore > 0) {
      this.addedContainer.textContent = "+" + addedScore;
   }
   else {
      this.addedContainer.textContent = "";
   }
}

GameRenderer.prototype.clearMessage = function() {
   // clear the winner or lose message
   // TODO:
}

function MonteCarloTreeSearch(MaxDeep, Score, Grid, Renderer, InputManager) {
   // set the grid and renderer for the AI
   this.Grid         = Grid;
   this.Renderer     = Renderer;
   this.InputManager = InputManager;

   // bind the move and restart function of the game.
   this.InputManager.on("moveAI", this.moveAI.bind(this));

   // set the configuration of the AI here
   this.MaxDeep  = MaxDeep; // only search for 10 level of deep
   this.die      = false;
   this.paused   = false;
   this.score    = Score;
}

MonteCarloTreeSearch.prototype.getDie = function() {
   return this.die;
}

MonteCarloTreeSearch.prototype.setDie = function(die) {
   this.die = die;
}

MonteCarloTreeSearch.prototype.getPaused = function() {
   return this.isPaused;
}

MonteCarloTreeSearch.prototype.setPaused = function(paused) {
   this.paused = paused;
}

MonteCarloTreeSearch.prototype.stepAI = function() {
   var BestDirection = this.processAI(this.Grid);
   if(BestDirection >= 0) {
      this.InputManager.addCommand(BestDirection);
   }
}

MonteCarloTreeSearch.prototype.startAI = function() {
   var self = this;

   // here we will start the AI, and will only going to be finished
   // if we got the direction as -1, which means that there are no more
   // move is available.
   var BestDirection;

   // initialized the indicator.
   this.die      = false;
   this.paused   = false;
   do {
      // start the AI
      this.stepAI();

      // check whether we need to break from the loop or not?
      if (BestDirection < 0) return; 
      if (this.die) return;
      if (this.paused) return;
   } while(1); // should be put as AI paused also
}

MonteCarloTreeSearch.prototype.pauseAI = function() {
   this.paused = true;
}

MonteCarloTreeSearch.prototype.processAI = function(Grid) {
   var self = this;
   var BestDirection = -1;
   var MaxScore = 0;
   var MaxMoves = 0;
   var CurrentGrid;
   var MetaData;
   var CurrentGrid = Grid.clone();

   // loop through all the grid list to knew which direction that
   // we should take.
   // first assuming that there are no move is available.
   this.die = true;

   // then loop for all the possible move (up, down, left, right)
   // and check which move will be giving the better score
   for(var i = 0; i < 4; i++) {
      // get the meta data for each run
      // console.log("Trying for direction: " + i);
      var MetaData = this.performSearch(CurrentGrid, i);

      // check whether we beat previous score or not?
      if (MetaData.score > MaxScore) {
         BestDirection = i;
         MaxScore = MetaData.score;
         MaxMoves = MetaData.moves;
      }
   }

   // return the best direction we got
   console.log("MonteCarlo --> Best Score : " + MaxScore + ", Average Moves : " + MaxMoves + ", Best Direction : " + BestDirection);
   return BestDirection;
}

MonteCarloTreeSearch.prototype.performSearch = function(Grid, Move) {
   var self = this;
   var TotalScore = 0;
   var TotalMoves = 0;

   // try to perform single move until max deep, so we can get the
   // average score of each move for max-deep times.
   for(var i = 0; i < this.MaxDeep; i++) {
      var RunResult = this.runGrid(Grid, Move);

      // check whether we got score or not? if it was returned with
      // -1, it means that we cannot move to this location, so we can
      // skip this move
      if (RunResult.score <= -1 ) {
         return RunResult;
      }

      // if not then put the current run score to the total score
      TotalScore    = TotalScore + RunResult.score;
      TotalMoves    = TotalMoves + RunResult.moves;
   }

   // once we got the total score and moves, get the average value of it.
   var AverageScore = TotalScore / this.MaxDeep;
   var AverageMoves = TotalMoves / this.MaxDeep;

   return {score: AverageScore, moves: AverageMoves};
}

MonteCarloTreeSearch.prototype.runGrid = function(Grid, Move) {
   // first clone the Grid
   var self = this;
   var g = Grid.clone();
   var score = 0;
   var moves = 0;
   var curr_moves;

   // then ensure that we can move the grid, if not then just
   // return -1 to the performSearch.
   var MetaData = g.move(Move);
   if (MetaData && MetaData.moved) {
      // if we can moved then add the current score with the score
      // we got when we performed the first move
      score = score + MetaData.score;
      // then add random tiles to the grid, and add the moves number
      // that already performed.
      this.addRandomTile(g);
      moves = moves + 1;

      // after that, loop until we die!
      while(true) {
         // random the next move that we will performed.
         curr_moves = Math.floor(Math.random() * 4)
         MetaData = g.move(curr_moves);

         // check whether we can move or not?
         if(MetaData && MetaData.moved) {
            // add the score and moves number
            score = score + MetaData.score;
            moves = moves + 1;
            // then add random tiles
            this.addRandomTile(g);
         }

         // check whether we die already or not?
         this.die = this.isDie(g);
         if(this.die) {
            // console.log("well, it's die!");
            break;
         }
      }

      // return the score and moves we got
      // console.log("Return score: " + score);
      return {score: score, moves: moves};
   }
   else {
      // console.log("No move already? Really?!");
      // cannot move, return -1
      return {score: -1, moves: 0};
   }
}

MonteCarloTreeSearch.prototype.addRandomTile = function(Grid) {
   // first check whether we have cells available
   if(Grid.getAvailableCells) {
      // there are available cells that we can fill on the grid.
      // generate the random value that we will put on the box, and get
      // random location that we will use to insert the tile.
      var value = Math.random() < 0.9 ? 2 : 4;
      var tile_position = Grid.randomAvailableCells();
      var tile = new Tile(tile_position.row, tile_position.col, value);

      // insert the tile to the grid
      Grid.insertTile(tile);
   }

   // return the Grid back to the caller
   return Grid;
}

MonteCarloTreeSearch.prototype.moveAI = function(dir) {
   var self = this;
   var metadata = this.Grid.move(dir);

   // after move, ensure that we still have move to be performed.
   this.die = this.isDie(this.Grid);
   if(!this.die) {
      // check whether we got a move or not?
      if(metadata && metadata.moved) {
         // add the score
         this.score += metadata.score;
         // add new random tile
         this.Grid = this.addRandomTile(this.Grid);
         // render the board again
         this.Renderer.render(this.Grid, {score : this.score, die: this.die, won: this.won});
      }
   }
   else {
      console.log("AI: No more move, die already!");
   }
}

MonteCarloTreeSearch.prototype.isDie = function(Grid) {
   // check whether we have moves available for all direction
   return !(Grid.moveAvailable(0) || Grid.moveAvailable(1) ||
            Grid.moveAvailable(2) || Grid.moveAvailable(3));
}

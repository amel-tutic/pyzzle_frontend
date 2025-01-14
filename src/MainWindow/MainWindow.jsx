import { useState, useEffect } from 'react';
import './MainWindow.css';
import axios from 'axios';

function MainWindow() {
  const [image, setImage] = useState(null); // State to store the selected image
  const [tileSize, setTileSize] = useState(3); // State for the number of tiles (N)
  const [tiles, setTiles] = useState([]); // State to store the sliced image tiles
  const [tileNumbers, setTileNumbers] = useState([]); // State to store tile numbers
  const [emptyPosition, setEmptyPosition] = useState(null); // State to track the position of the empty tile (0)
  const [shuffles, setShuffles] = useState([]); // Store a history of shuffled tile positions
  const [log, setLog] = useState([]); // State to store the log of moves
  const [algorithm, setAlgorithm] = useState(''); // Selected algorithm
  const [heuristic, setHeuristic] = useState(''); // Selected heuristic
  const [initialTileState, setInitialTileState] = useState([]); // To store the initial state after shuffle
  const [timeoutIds, setTimeoutIds] = useState([]);  // Store timeout IDs to clear later
  const [currentStepIndex, setCurrentStepIndex] = useState(0);  // Track the last completed step
  const [savedState, setSavedState] = useState(null); // To save the paused state
  const [stepsCloud, setStepsCloud] = useState([]);
  const [delay, setDelay] = useState();

  // Function to handle file selection and automatically slice the image
  const handleImageChange = (e) => {
    const file = e.target.files[0]; // Get the first file selected
    if (file) {
      setImage(file);
      setTiles([]); // Reset tiles when a new image is selected
      setTileNumbers([]); // Reset tile numbers
      setEmptyPosition(null); // Reset empty position
      setShuffles([]); // Reset shuffle history
      setLog([]); // Reset log history
      sliceImageIntoTiles(file, tileSize); // Slice image right after uploading
    }
  };

  // Function to handle tile size change and re-slice the image
  const handleTileSizeChange = (e) => {
    const newTileSize = parseInt(e.target.value); // Set the N value
    setTileSize(newTileSize); // Update tile size
    setTiles([]); // Reset tiles when the size changes
    setTileNumbers([]); // Reset tile numbers
    setEmptyPosition(null); // Reset empty position
    setShuffles([]); // Reset shuffle history
    setLog([]); // Reset log history
    if (image) {
      sliceImageIntoTiles(image, newTileSize); // Re-slice the image for the new N value
    }
  };

  // Function to slice the image into N x N tiles
  const sliceImageIntoTiles = (file, newTileSize) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const tileWidth = img.width / newTileSize;
      const tileHeight = img.height / newTileSize;
      const newTiles = [];
      const newTileNumbers = [];

      // Create tiles by drawing each portion of the image to the canvas
      for (let row = 0; row < newTileSize; row++) {
        for (let col = 0; col < newTileSize; col++) {
          const tileCanvas = document.createElement('canvas');
          const tileCtx = tileCanvas.getContext('2d');
          tileCanvas.width = tileWidth;
          tileCanvas.height = tileHeight;

          tileCtx.drawImage(
            img,
            col * tileWidth,
            row * tileHeight,
            tileWidth,
            tileHeight,
            0,
            0,
            tileWidth,
            tileHeight
          );

          newTiles.push(tileCanvas.toDataURL()); // Store the image data as base64
        }
      }

      // Create tile numbers from 1 to N*N-1, with 0 at the bottom-right position
      const initialTileNumbers = Array.from({ length: newTileSize * newTileSize }, (_, index) => index + 1);
      initialTileNumbers[newTileSize * newTileSize - 1] = 0; // Set bottom-right tile to 0

      setTiles(newTiles); // Update the state with the new tiles
      setTileNumbers(initialTileNumbers); // Set the initial tile numbers
      setEmptyPosition(newTileSize * newTileSize - 1); // The empty position is at the bottom-right initially
    };
  };


  // Function to check if the puzzle is solved
  const isPuzzleSolved = () => {
    const correctOrder = Array.from({ length: tileSize * tileSize }, (_, index) => index + 1);
    correctOrder[tileSize * tileSize - 1] = 0; // Empty tile (0) is last in the correct order
    return JSON.stringify(tileNumbers) === JSON.stringify(correctOrder);
  };

  // Function to reset the tiles to their starting (solved) positions
  const resetTiles = () => {
    // const tileSizeSq = tileSize * tileSize;
    // const newTileNumbers = Array.from({ length: tileSizeSq }, (_, index) => index + 1);
    // newTileNumbers[tileSizeSq - 1] = 0; // Set bottom-right tile to 0
  
    // setTileNumbers(newTileNumbers); // Reset tile numbers
    // setTiles([]); // Reset the tile images
    // setEmptyPosition(tileSizeSq - 1); // Reset the empty position
    // setShuffles([]); // Clear the shuffle history log
    // setLog([]); // Clear the move log
  
    // sliceImageIntoTiles(image, tileSize); // Re-slice the image to its original form
    setDelay(0);
  };

  // Function to shuffle the tile numbers and their images
 const shuffleTiles = () => {
  const tileSizeSq = tileSize * tileSize;
  const newTileNumbers = [...tileNumbers];
  const newTiles = [...tiles];

  // Perform a simple shuffle algorithm (Fisher-Yates shuffle)
  for (let i = tileSizeSq - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Swap the numbers
    [newTileNumbers[i], newTileNumbers[j]] = [newTileNumbers[j], newTileNumbers[i]];
    // Swap the corresponding tiles (images)
    [newTiles[i], newTiles[j]] = [newTiles[j], newTiles[i]];
  }

  // Ensure the last position (empty space) is always 0
  const emptyIndex = newTileNumbers.indexOf(0);
  const lastIndex = newTileNumbers.length - 1;
  [newTileNumbers[emptyIndex], newTileNumbers[lastIndex]] = [newTileNumbers[lastIndex], newTileNumbers[emptyIndex]];
  [newTiles[emptyIndex], newTiles[lastIndex]] = [newTiles[lastIndex], newTiles[emptyIndex]];

  setTileNumbers(newTileNumbers); // Update the tile numbers state with shuffled numbers
  setTiles(newTiles); // Update the tile images state with shuffled images
  setInitialTileState([...newTileNumbers]); // Save the shuffled state as the initial state
};

  // Function to handle tile click and move it into the empty space (0 position)
  const handleTileClick = (index) => {
    if (emptyPosition === null) return;

    const tileSizeSq = tileSize * tileSize;
    const emptyRow = Math.floor(emptyPosition / tileSize);
    const emptyCol = emptyPosition % tileSize;
    const clickedRow = Math.floor(index / tileSize);
    const clickedCol = index % tileSize;

    // Check if the clicked tile is adjacent to the empty space (0)
    const isAdjacent =
      (Math.abs(emptyRow - clickedRow) === 1 && emptyCol === clickedCol) ||
      (Math.abs(emptyCol - clickedCol) === 1 && emptyRow === clickedRow);

    if (isAdjacent) {
      // Swap the clicked tile with the empty position
      const newTileNumbers = [...tileNumbers];
      newTileNumbers[emptyPosition] = newTileNumbers[index];
      newTileNumbers[index] = 0;

      const newTiles = [...tiles];
      newTiles[emptyPosition] = newTiles[index];
      newTiles[index] = "";

      setTileNumbers(newTileNumbers);
      setTiles(newTiles);
      setEmptyPosition(index); // Update the empty position to the clicked tile's position

      // Log the move
      const moveDescription = `Moved tile ${tileNumbers[index]} to position ${emptyPosition + 1}`;
      setLog((prevLog) => [...prevLog, moveDescription]); // Add the move to the log
    }
  };

  //Function to get steps for solving the puzzle
// Function to apply steps to solve the puzzle
const applyStepsWithDelay = (steps) => {
    setStepsCloud(steps);
    let newTileNumbers = [...tileNumbers];
    let newTiles = [...tiles];
    let newEmptyPosition = emptyPosition;
    setDelay(700);
    // Log the total number of steps before starting the solution process
    setLog((prevLog) => [...prevLog, `Total Steps: ${steps.length}`]);
    setLog((prevLog) => [...prevLog, 'Starting...']);
    const timeoutIdArray = steps.map((step, index) =>
      setTimeout(() => {
        const clickedTileIndex = step;
        [newTileNumbers[newEmptyPosition], newTileNumbers[clickedTileIndex]] = [newTileNumbers[clickedTileIndex], newTileNumbers[newEmptyPosition]];
        [newTiles[newEmptyPosition], newTiles[clickedTileIndex]] = [newTiles[clickedTileIndex], newTiles[newEmptyPosition]];
        newEmptyPosition = clickedTileIndex;
        setTileNumbers(newTileNumbers);
        setTiles(newTiles);
        setEmptyPosition(newEmptyPosition);

        const moveDescription = `Step ${index + 1}: Moved tile at index ${clickedTileIndex} to empty position`;
        setLog((prevLog) => [...prevLog, moveDescription]);

        // If it's the last step, log 'Finished!'
      if (index === steps.length - 1) {
        setLog((prevLog) => [...prevLog, 'Finished!']);
      }

      // Update the current step index
      setCurrentStepIndex(index + 1);

      }, index * delay)
    );

    setTimeoutIds(timeoutIdArray);
  };

  const pause = () => {
    // Save the current state before pausing
    setSavedState({
      tileNumbers: [...tileNumbers],
      tiles: [...tiles],
      emptyPosition,
      currentStepIndex
    });
  
    // Clear all timeouts
    timeoutIds.forEach(id => clearTimeout(id));
  
    // Optionally clear the timeoutIds array after pausing
    setTimeoutIds([]);
  
    // Log the pause action
    setLog((prevLog) => [...prevLog, 'Paused!']);
  };

  const resume = (steps) => {
    // Check if we have saved state
    if (savedState) {
      const { tileNumbers, tiles, emptyPosition, currentStepIndex } = savedState;
  
      // Restore the saved state
      setTileNumbers(tileNumbers);
      setTiles(tiles);
      setEmptyPosition(emptyPosition);
      setCurrentStepIndex(currentStepIndex);
  
      // Resume from the last completed step
      applyStepsWithDelay(steps.slice(currentStepIndex));
  
      setLog((prevLog) => [...prevLog, 'Resumed...']);
    } else {
      // In case there's no saved state (this can happen if the user presses resume before pausing)
      setLog((prevLog) => [...prevLog, 'No saved state to resume from.']);
    }
  };

// Apply the steps when the puzzle is being solved
const solvePuzzle = async () => {
  if (!algorithm) {
    alert("Please select an algorithm before solving the puzzle.");
    return;
  }

  if ((algorithm === "bestFirst" || algorithm === "aStar") && !heuristic) {
    alert("Please select a heuristic for the chosen algorithm.");
    return;
  }

  if (!isSolvable()) {
    alert("The puzzle is not solvable!");
    return;
  }

  try {
    // Map algorithms to API endpoints
    const endpoints = {
      bfs: "https://pyzzle-backend.onrender.com/api/run_bfs/",
      bestFirst: "https://pyzzle-backend.onrender.com/api/run_best_first_search/",
      aStar: "https://pyzzle-backend.onrender.com/api/run_a_star/",
    };

    const apiEndpoint = endpoints[algorithm];
    if (!apiEndpoint) {
      alert("Invalid algorithm selected.");
      return;
    }

    // Prepare the request payload
    const totalTiles = tileSize * tileSize;
    const goal_state = Array.from({ length: totalTiles - 1 }, (_, i) => i + 1).concat(0); // Goal state with 0 as the last element

    const payload = {
      size: tileSize,
      initial_state: tileNumbers, // Current state of tiles
      goal_state: goal_state, // Ensures 0 is in the last position
    };

    if (algorithm === "bestFirst" || algorithm === "aStar") {
      payload.heuristic = heuristic;
    }

    // Make the API request using axios
    const response = await axios.post(apiEndpoint, payload);

    // Extract the steps from the response
    const { steps } = response.data;

    if (!steps || steps.length === 0) {
      alert("No solution was found for the given puzzle.");
      return;
    }

    // Apply the solution steps to the puzzle
    applyStepsWithDelay(steps); // This will apply the steps and visually update the puzzle

  } catch (error) {
    console.error(error);
    alert("An error occurred while solving the puzzle. Please try again.");
  }
};

  // Function to calculate inversions and check if the puzzle is solvable
  const isSolvable = () => {
    const tileArray = tileNumbers.filter(num => num !== 0); // Remove the empty space (0)
    let inversions = 0;

    // Count inversions
    for (let i = 0; i < tileArray.length; i++) {
      for (let j = i + 1; j < tileArray.length; j++) {
        if (tileArray[i] > tileArray[j]) inversions++;
      }
    }

    // For odd-size puzzles, the puzzle is solvable if inversions are even
    if (tileSize % 2 !== 0) {
      return inversions % 2 === 0;
    }

    // For even-size puzzles, the row of the empty space affects the solvability
    const emptyRow = Math.floor(emptyPosition / tileSize);
    if (emptyRow % 2 === 0) {
      return inversions % 2 === 1; // Even row -> inversions must be odd
    } else {
      return inversions % 2 === 0; // Odd row -> inversions must be even
    }
  };

  // Use effect to detect key press event for 'Enter' and reset tiles
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        resetTiles(); // Reset tiles when 'Enter' is pressed
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tileSize, image]);

  return (
    <div className="upload-container">
      <div className="left-container">
        <h1>Pyzzle</h1>

        <h3>Choose the Image</h3>

        {/* Image placeholder with tiles */}
        <div className="image-placeholder">
          {image ? (
            <div>
              {/* Render full image if puzzle is solved */}
              {isPuzzleSolved() ? (
                <img src={URL.createObjectURL(image)} alt="Full Image" className="full-image" />
              ) : (
                <div className="tile-grid" style={{
                    gridTemplateColumns: `repeat(${tileSize}, 1fr)`, // Define columns dynamically
                    gridTemplateRows: `repeat(${tileSize}, 1fr)`, // Define rows dynamically
                  }}>
                  {tiles.map((tile, index) => (
                    <div
                      key={index}
                      className="tile-container"
                      onClick={() => handleTileClick(index)}
                      style={{ visibility: tileNumbers[index] === 0 ? "hidden" : "visible" }}
                    >
                      <img src={tile} alt={`Tile ${index}`} className="tile" />
                      <span className="tile-number">
                        {tileNumbers[index] === 0 ? '' : tileNumbers[index]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="image-placeholder-text">No Image Selected</span>
          )}
        </div>

        {/* Tile size input */}
        <div className="input-container">
          <label htmlFor="tile-size" className="tile-size-label">Number of Tiles (N):</label>
          <input
            type="number"
            id="tile-size"
            value={tileSize}
            onChange={handleTileSizeChange}
            min="1"
            className="tile-size-input"
          />
        </div>

        {/* File input button */}
        <div className="button-container">
          <label htmlFor="file-upload" className="upload-button">
            Choose Image
          </label>
          <input
            type="file"
            id="file-upload"
            accept="image/*"
            onChange={handleImageChange}
            className="upload-input"
            style={{ display: 'none' }} // Hide the file input
          />
        </div>

        {/* Shuffle Button */}
        <button onClick={shuffleTiles} className="shuffle-btn">
          Shuffle Tiles
        </button>

        {/* Reset Button */}
        <button onClick={resetTiles} className="reset-btn">
          Reset Tiles
        </button>

        <button onClick={pause}>Pause</button>
        <button onClick={() => resume(stepsCloud)}>Resume</button>
      </div>

      <div className="right-container">
        <h2>Current Tile Positions</h2>
        {tileNumbers.length > 0 && (
          <div className="tile-positions-row">
            {tileNumbers.map((tile, index) => (
              <span key={index} className="tile-position">
                {tile}
              </span>
            ))}
          </div>
        )}

<h3>Initial Puzzle State</h3>
  {initialTileState.length > 0 && (
    <div className="tile-positions-row">
      {initialTileState.map((tile, index) => (
        <span key={index} className="tile-position">
          {tile}
        </span>
      ))}
    </div>
  )}

  <h3>Goal Puzzle State</h3>
  {tileNumbers.length > 0 && (
    <div className="tile-positions-row">
      {Array.from({ length: tileSize * tileSize }, (_, index) => (index + 1) % (tileSize * tileSize))
        .map((tile, index) => (
          <span key={index} className="tile-position">
            {tile}
          </span>
        ))}
    </div>
  )}
        <h3>Is Puzzle Solvable?</h3>
        <p>{isSolvable() ? "Yes" : "No"}</p>

        <h2>Move Log</h2>
        <div className="log-section">
          {log.length > 0 ? (
            log.map((logItem, index) => (
              <div key={index} className="log-item">
                {logItem}
              </div>
            ))
          ) : (
            <span>No moves made yet.</span>
          )}
        </div>

        <div className="algorithm-container">
  <label htmlFor="algorithm-select" className="algorithm-label">Select Algorithm:</label>
  <select
    id="algorithm-select"
    value={algorithm}
    onChange={(e) => setAlgorithm(e.target.value)}
    className="algorithm-select"
  >
    <option value="">-- Choose Algorithm --</option>
    <option value="bfs">Breadth-First Search</option>
    <option value="bestFirst">Best-First Search</option>
    <option value="aStar">A* Search</option>
  </select>
</div>

{/* Show heuristic selection only for Best-First Search and A* Search */}
{(algorithm === 'bestFirst' || algorithm === 'aStar') && (
  <div className="heuristic-container">
    <label htmlFor="heuristic-select" className="heuristic-label">Select Heuristic:</label>
    <select
      id="heuristic-select"
      value={heuristic}
      onChange={(e) => setHeuristic(e.target.value)}
      className="heuristic-select"
    >
      <option value="">-- Choose Heuristic --</option>
      <option value="hamming">Hamming Distance</option>
      <option value="manhattan">Manhattan Distance</option>
    </select>
  </div>
)}

<button onClick={solvePuzzle} className="solve-btn">
  Solve Puzzle
</button>

      </div>
    </div>
  );
}

export default MainWindow;

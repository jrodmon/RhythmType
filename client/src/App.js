import React, { useState, useEffect, useRef } from "react";
import { createRef } from "react";
import words from "./words.json";
import { musicSheets } from "./musicSheets";

function App() {
  // =========================== State Management ============================
  const [letters, setLetters] = useState([]);
  const [running, setRunning] = useState(true);
  const [currentWord, setCurrentWord] = useState("");
  const [wordColor, setWordColor] = useState("red");
  const [currentSheetName, setCurrentSheetName] = useState("Fur Elise");
  const [currentSheet, setCurrentSheet] = useState(musicSheets["Fur Elise"]);
  const [frozen, setFrozen] = useState(false); // to freeze the game when a letter hits the bottom or a misinput occurs

  // =========================== Refs (Game Control) ============================
  const spawnTimeouts = useRef({}); // store timeouts per wordIndex
  const letterIndexRef = useRef(0);
  const currentXRef = useRef(0);
  const noteIndexRef = useRef(0); // track which note to play next
  const nextWordIndexRef = useRef(0);
  const inputLockedRef = useRef(false); // to prevent user input when making a mistake
  const spawnPausedRef = useRef(false); // to pause spawning when a letter hits the bottom or a misinput occurs
  const earliestLetterId = letters.length > 0 ? letters[0].id : null;     //this isnt ever used haha

  // =========================== Game Dimensions ============================
  const gameWidth = 1000;
  const gameHeight = 600;
  const letterSpacing = 40;

  // =========================== Scoring / Stats ============================
  const [score, setScore] = useState(0);                      // increments based on hit quality and multiplier
  const [multiplier, setMultiplier] = useState(1);            // increases every 15 successful hits
  const [totalHits, setTotalHits] = useState(0);              // increments on every successful hit
  const [totalPossible, setTotalPossible] = useState(0);      // used for calculating accuracy
  const [combo, setCombo] = useState(0);                      // to track current combo count
  const [hitIndicators, setHitIndicators] = useState([]);     // to show hit quality indicators (Perfect, Good, Miss, etc.)

  const targetLineY = 150; // y-position of the target line
  const perfectWindow = 40; // range of pixels for perfect hit
  const okWindow = 60; // range of pixels for ok hit
  const badWindow = 90; // range of pixels for bad hit

  const scoreValues = {
    perfect: 300,
    ok: 100,
    bad: 50,
    miss: 0,
  }

  const accuracy =
    totalPossible > 0 ? (totalHits / totalPossible) * 100 : 100;

  const showHitIndicator = (type, x, y) => {
    const id = Date.now() + Math.random();
    setHitIndicators((prev) => [...prev, { id, type, x, y }]);

    setTimeout(() => {
      setHitIndicators((prev) => prev.filter((ind) => ind.id !== id));
    }, 800); // indicator lasts for 800ms
  }



  const { pixelsPerInterval, delayPerMovement, pianoNotes } = currentSheet;

  // =========================== Word Selection ============================
  const chooseNewWord = () => {
    if (!running) return;

    const newWord = words[Math.floor(Math.random() * words.length)];
    if (currentXRef.current + newWord.length * letterSpacing > gameWidth) {
      currentXRef.current = 0;
    }
    setCurrentWord(newWord);
    letterIndexRef.current = 0;
    setWordColor((prev) => (prev === "red" ? "blue" : "red"));
  };

  // =========================== Initial Word Setup ============================
  useEffect(() => {
    if(running && letters.length === 0) {
      chooseNewWord();
    }
  }, [letters, running]);

  // =========================== Letter Spawning ============================
  useEffect(() => {
    if (!currentWord) return;

    const wordIndex = nextWordIndexRef.current++;

    const spawnNextLetter = () => {
      if (!running || spawnPausedRef.current || frozen) return;

      const index = letterIndexRef.current;

      if (index >= currentWord.length) {
        // Word finished spawning
        delete spawnTimeouts.current[wordIndex];
        
        spawnTimeouts.current[wordIndex] = setTimeout(() => {
          if (running) chooseNewWord();
        }, 100); // time in ms before next word spawns
        return;
      }

      const newLeft = currentXRef.current;

      // =================== Create new letter ===================
      const newLetter = {
        id: Date.now() + Math.random(),
        char: currentWord[index].toUpperCase(),
        top: 0,
        left: newLeft,
        wordIndex,
        ref: createRef(), // createRef for dynamically reading the size of each letter
      };
      // ==========================================================

      setLetters((prev) => [...prev, newLetter]);
      currentXRef.current += letterSpacing;
      letterIndexRef.current = index + 1;

      const wordsPerMinute = currentSheet.wordsPerMinute || 60;
      const charsPerMinute = wordsPerMinute * 5;
      const delayBetweenNotes = 60000 / charsPerMinute;

      spawnTimeouts.current[wordIndex] = setTimeout(spawnNextLetter, delayBetweenNotes );
    };

    const handleMissOrFail = () => {
      // Play miss sound
      const missAudio = new Audio("/sounds/missSound.wav");
      missAudio.currentTime = 0;
      missAudio.volume = 0.7;
      missAudio.play();

      // Pause spawning for some time
      spawnPausedRef.current = true;
      setTimeout(() => {
        spawnPausedRef.current = false;
        spawnNextLetter();
      }, 3000);
    }

    spawnNextLetter();

    return () => {
      Object.values(spawnTimeouts.current).forEach(clearTimeout);
    };
  }, [currentWord, running, wordColor, currentSheet]);

  // =========================== Letter Movement ============================
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setLetters((prev) => {
        if (frozen) return prev; // do not move letters if the game is frozen

        let hitBottom = false;

        // Move each letter down and check if any hit the bottom
        const updated = prev.map((letter) => {
          const newTop = letter.top + pixelsPerInterval;
          if (newTop >= gameHeight - 1) hitBottom = true;
          return { ...letter, top: newTop };
        });

        // if a letter reaches the bottom of the screen clears the screen
        if (hitBottom) {
          // Play miss sound
          const missAudio = new Audio("/sounds/letterReachesBottom.wav"); //can change this audio file in the future
          missAudio.currentTime = 0;
          missAudio.volume = 0.7;
          missAudio.play();

          // Stop all spawning letters
          Object.values(spawnTimeouts.current).forEach((timeout) => clearTimeout(timeout));
          spawnTimeouts.current = {};

          // Optionally reset multiplier and increment totalPossible
          setMultiplier(1);
          setTotalPossible((prev) => prev + 1);

          return []; // remove all letters
        }

        return updated;
      });
    }, delayPerMovement);

    return () => clearInterval(interval);
  }, [running, pixelsPerInterval, delayPerMovement]);











// =========================== Input Handling (Typing) ============================
useEffect(() => {
  const handleKeyDown = (e) => {
    const ignoredKeys = [
      "Shift","CapsLock","Tab","Control","Alt","Meta",
      "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
      "Enter","Backspace","Delete","Home","End","PageUp","PageDown",
      "Insert","NumLock","ScrollLock","Pause","PrintScreen",
      "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
      " "
    ];
    if (ignoredKeys.includes(e.key)) return;

    // Toggle pause
    if (e.key === "Escape") {
      setRunning(prev => !prev);
      return;
    }
    if (!running) return;

    // Prevent input after mistake
    if (inputLockedRef.current) return;

    setLetters(prev => {
      if (prev.length === 0) return prev;

      // Find active letter (lowest on screen)
      let targetIndex = -1;
      let maxTop = -1;
      prev.forEach((letter, idx) => {
        if (letter.top > maxTop) {
          maxTop = letter.top;
          targetIndex = idx;
        }
      });

      const activeLetter = prev[targetIndex];
      if (!activeLetter || !activeLetter.ref.current) return prev;

      const gameArea = document.getElementById("game-area");
      if (!gameArea) return prev;

      const gameRect = gameArea.getBoundingClientRect();
      const letterRect = activeLetter.ref.current.getBoundingClientRect();
      const letterX = letterRect.left + letterRect.width / 2 - gameRect.left;
      const letterY = letterRect.top + letterRect.height / 2 - gameRect.top;

      const isCorrectKey = activeLetter.char.toLowerCase() === e.key.toLowerCase();

      // ================= Incorrect Key Handling (Incorrect Letter) =================
      if (!isCorrectKey) {
        showHitIndicator("!!", letterX, letterY);
        const missAudio = new Audio("/sounds/missSound.wav");
        missAudio.currentTime = 0;
        missAudio.volume = 0.7;
        missAudio.play();

        //setFrozen(true);
        //setTimeout(() => setFrozen(false), 300);

        setMultiplier(1);
        setCombo(0);
        setTotalPossible(prev => prev + 1);

        // Lock input briefly
        inputLockedRef.current = true;
        setTimeout(() => { inputLockedRef.current = false; }, 300);

        // Remove the active letter even on misinput
        return prev.filter(letter => letter.wordIndex !== activeLetter.wordIndex);
      }

      // ================= Correct Key Handling =================
      const letterCenterY = letterRect.top + letterRect.height / 2;
      const targetLineY = gameRect.bottom - 150; // 150px from bottom
      const distance = Math.abs(letterCenterY - targetLineY);

      let hitQuality = "miss"; // default
      if (distance <= perfectWindow) hitQuality = "perfect";
      else if (distance <= okWindow) hitQuality = "ok";
      else if (distance <= badWindow) hitQuality = "bad";
      
      // Play miss sound if it's a miss
      if (hitQuality === "miss") {
        showHitIndicator("X", letterX, letterY);
        const missAudio = new Audio("/sounds/missSound.wav");
        missAudio.currentTime = 0;
        missAudio.volume = 0.7;
        missAudio.play();

        setMultiplier(1);
        setCombo(0);

        //return prev.filter(letter => letter.wordIndex !== activeLetter.wordIndex);      // removes the whole word if a "miss" occurs
        return prev.filter((letter, idx) => idx !== targetIndex);                       //removes only the active letter if a "miss occurs"
      }

      // Show hit indicator
      showHitIndicator(hitQuality, letterX, letterY);

      // Play note if not a miss
      if (hitQuality !== "miss") {
        const note = pianoNotes[noteIndexRef.current];
        if (note) {
          const audio = new Audio(`/sounds/${note}.mp3`);
          audio.currentTime = 0;
          audio.play();
          noteIndexRef.current = (noteIndexRef.current + 1) % pianoNotes.length;
        }
      }

      // ================= Scoring =================
      if (hitQuality === "miss") {
        setFrozen(true);
        setTimeout(() => setFrozen(false), 300);
        setMultiplier(1);
        setCombo(0);
      } else {
        const points = scoreValues[hitQuality];
        setScore(prev => prev + points * multiplier);
        setCombo(prev => {
          const newCombo = prev + 1;
          if (newCombo % 15 === 0) setMultiplier(prevMult => prevMult + 1);
          return newCombo;
        });
        setTotalHits(prev => prev + 1);
      }
      setTotalPossible(prev => prev + 1);

      // Remove letter from screen
      return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
    });
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [running, pianoNotes]);










  // =========================== Song Change Handling ============================
  const handleSheetChange = (e) => {
    const selected = e.target.value;
    setCurrentSheetName(selected);
    setCurrentSheet(musicSheets[selected]);

    // Reset game state
    noteIndexRef.current = 0;
    letterIndexRef.current = 0;
    nextWordIndexRef.current = 0;
    currentXRef.current = 0;

    Object.values(spawnTimeouts.current).forEach(clearTimeout);
    spawnTimeouts.current = {};
    
    setCurrentWord("");
    setLetters([]);
    
    if (running) {
      setTimeout(() => chooseNewWord(), 0); 
    }
  };

  // =========================== Game Rendering ============================
  return (
    <div style={{ display: "flex", 
    flexDirection: "column", 
    justifyContent: "center", 
    alignItems: "center", 
    height: "100vh", 
    backgroundColor: "#111" }}>
      {/* Song Selector */}
      <select value={currentSheetName} onChange={handleSheetChange} style={{ marginBottom: "10px", fontSize: "16px" }}>
        {Object.keys(musicSheets).map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      {/* Game Area */}
      <div
        id = "game-area"
          style={{ 
          position: "relative", 
          width: `${gameWidth}px`, 
          height: `${gameHeight}px`, 
          overflow: "hidden", 
          background: "#111", 
          color: "white", 
          border: "2px solid #333", 
          borderRadius: "8px" }}>
        
          {/* Letters */}
          {letters.map((letter, idx) => {
            const borderColor = letter.wordIndex % 2 === 0 ? "red" : "blue";
            const isEarliest = idx === 0; // to highlight the earliest letter
            return (
              <div 
              key={letter.id} 
              ref={letter.ref}  // createRef for dynamically reading the size of each letter
              style={
                {
                  position: "absolute",
                  top: letter.top,
                  left: letter.left,
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: isEarliest ? "black" : "#424242ff",
                  backgroundColor: isEarliest ? "white" : "gray",
                  //backgroundColor: isEarliest ? borderColor : "white", color: isEarliest ? "white" : "black",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: `4px solid ${borderColor}`,
                  boxShadow: isEarliest ? "0 0px 12px rgba(0,0,0,0.6)" : "0 2px 6px rgba(0, 0, 0, 0.4)",
                  userSelect: "none",
                  transform: isEarliest ? "scale(1.2)" : "scale(1)",
                  transition: "transform 0.2s ease",
                  zIndex: isEarliest ? 10 : 1}}
                >
                {letter.char}
              </div>
            );
          })}

          {/* Hit Indicators */}
          {hitIndicators.map(ind => (
            <div
              key={ind.id}
              style={{
                position: "absolute",
                left: ind.x,
                top: ind.y,
                transform: "translate(-50%, -50%)",
                color: ind.type === "perfect" ? "#00ff00" :
                      ind.type === "ok" ? "#ffff00" :
                      ind.type === "bad" ? "#ff9900" :
                      "#ff0000",
                fontWeight: "500",
                fontSize: "24px",
                textShadow: "0 0 2px black",
                pointerEvents: "none",
                zIndex: 1000,
                opacity: 0.8,
                animation: "floatUp 0.8s ease-out forwards"
              }}
            >
              {ind.type === "perfect" ? "O" : ind.type === "miss" ? "X" : ind.type.toUpperCase()}

            </div>
          ))}


          {/* Target Line */}
          <div style={{ 
            position: "absolute", 
            bottom: "150px", 
            left: 0, 
            width: "100%", 
            height: "4px", 
            backgroundColor: "orange" ,
            zIndex: 999
            }} />

          {/* Score / Accuracy */}
          <div style={{ 
            position: "absolute", 
            top: "10px", right: "10px", 
            textAlign: "right", 
            color: "white", 
            fontFamily: "monospace", 
            padding: "10px", 
            borderRadius: "8px", 
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999
          }}
            >
            <div style={{ fontSize: "20px", fontWeight: "bold" }}>Score: {score}</div>
            <div style={{ fontSize: "16px", marginTop: "6px" }}>Accuracy: {accuracy.toFixed(1)}%</div>
          </div>

          {/* Multiplier */}
          <div style={{ 
            position: "absolute", 
            bottom: "10px", 
            left: "10px", 
            color: "white", 
            fontSize: "30px", 
            fontWeight: "bold", 
            fontFamily: "monospace", 
            border: "2px solid white", 
            padding: "6px 12px", 
            borderRadius: "8px", 
            backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
            {multiplier}x
        </div>

        {/* Paused Overlay */}
        {!running && 
        <div 
            style=
              {
                { 
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontSize: "128px",
                  color: "Black",
                  border: "4px black solid",
                  backgroundColor: "rgba(221, 221, 221, 0.7)",
                  padding: "20px 40px",
                  borderRadius: "12px",
                  boxShadow: "0 0 20px rgba(0,0,0,0.5)",
                  userSelect: "none",
                  zIndex: 1000
                }
              }
          >
            PAUSED
            </div>
          }

        {/* Pause Button */}
        <button onClick={() => setRunning((prev) => !prev)} style={{ 
          position: "absolute", 
          top: "-50px", 
          left: "50%", 
          transform: "translateX(-50%)" }}>
          {running ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}

export default App;

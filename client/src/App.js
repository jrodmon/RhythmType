import React, { useState, useEffect, useRef } from "react";
import words from "./words.json";
import { musicSheets } from "./musicSheets";

function App() {
  const [letters, setLetters] = useState([]);
  const [running, setRunning] = useState(true);
  const [currentWord, setCurrentWord] = useState("");
  const [wordColor, setWordColor] = useState("red");
  const [currentSheetName, setCurrentSheetName] = useState("Fur Elise");
  const [currentSheet, setCurrentSheet] = useState(musicSheets["Fur Elise"]);

  const spawnTimeouts = useRef({}); // store timeouts per wordIndex
  const letterIndexRef = useRef(0);
  const currentXRef = useRef(0);
  const noteIndexRef = useRef(0); // track which note to play next
  const nextWordIndexRef = useRef(0);
  const inputLockedRef = useRef(false); // to prevent user input when making a mistake

  const gameWidth = 1000;
  const gameHeight = 600;
  const letterSpacing = 40;

  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [totalHits, setTotalHits] = useState(0);
  const [totalPossible, setTotalPossible] = useState(0);

  const accuracy =
    totalPossible > 0 ? (totalHits / totalPossible) * 100 : 100;

  const { pixelsPerInterval, delayPerMovement, pianoNotes } = currentSheet;

  // Pick a new random word
  const chooseNewWord = () => {
    const newWord = words[Math.floor(Math.random() * words.length)];
    if (currentXRef.current + newWord.length * letterSpacing > gameWidth) {
      currentXRef.current = 0;
    }
    setCurrentWord(newWord);
    letterIndexRef.current = 0;
    setWordColor((prev) => (prev === "red" ? "blue" : "red"));
  };

  useEffect(() => {
    if(running && letters.length === 0) {
      chooseNewWord();
    }
  }, [letters, running]);

  // Spawn letters sequentially
  useEffect(() => {
    if (!currentWord) return;

    const wordIndex = nextWordIndexRef.current++;

    const spawnNextLetter = () => {
      if (!running) return;

      const index = letterIndexRef.current;

      if (index >= currentWord.length) {
        // Word finished spawning
        delete spawnTimeouts.current[wordIndex];

        spawnTimeouts.current[wordIndex] = setTimeout(() => {
          if (running) chooseNewWord();
        }, 100);
        return;
      }

      const newLeft = currentXRef.current;

      const newLetter = {
        id: Date.now() + Math.random(),
        char: currentWord[index].toUpperCase(),
        top: 0,
        left: newLeft,
        wordIndex,
      };

      setLetters((prev) => [...prev, newLetter]);
      currentXRef.current += letterSpacing;
      letterIndexRef.current = index + 1;

      const wordsPerMinute = currentSheet.wordsPerMinute || 60;
      const charsPerMinute = wordsPerMinute * 5;
      const delayBetweenNotes = 60000 / charsPerMinute;

      spawnTimeouts.current[wordIndex] = setTimeout(
        spawnNextLetter,
        delayBetweenNotes
      );
    };

    spawnNextLetter();

    return () => {
      Object.values(spawnTimeouts.current).forEach(clearTimeout);
    };
  }, [currentWord, running, wordColor, currentSheet]);

  // Move letters downward
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setLetters((prev) =>
        prev
          .map((letter) => ({ ...letter, top: letter.top + pixelsPerInterval }))
          .filter((letter) => letter.top < gameHeight - 1)
      );
    }, delayPerMovement);

    return () => clearInterval(interval);
  }, [running, pixelsPerInterval, delayPerMovement]);

  // Handle typing + pause + play notes
  useEffect(() => {
    const handleKeyDown = (e) => {
      const ignoredKeys = [
        "Shift","CapsLock","Tab","Control","Alt","Meta",
        "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
        "Enter","Backspace","Delete","Home","End","PageUp","PageDown",
        "Insert","NumLock","ScrollLock","Pause","PrintScreen",
        "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"
      ];
      if (ignoredKeys.includes(e.key)) return;


      //to pause the game
      if (e.key === "Escape") {
        setRunning((prev) => !prev);
        return;
      }
      if (!running) return;


      // to prevent user input after making a mistake
      if (inputLockedRef.current) return;

      setLetters((prev) => {
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
        if (!activeLetter) return prev;

        const activeWordIndex = activeLetter.wordIndex;

        // if the correct key is inputted
        if (activeLetter.char.toLowerCase() === e.key.toLowerCase()) {
          const note = pianoNotes[noteIndexRef.current];
          if (note) {
            const audio = new Audio(`/sounds/${note}.mp3`);
            audio.currentTime = 0;
            audio.play();
            noteIndexRef.current = (noteIndexRef.current + 1) % pianoNotes.length;
          }
          return [...prev.slice(0, targetIndex), ...prev.slice(targetIndex + 1)];
        } else {
          // if incorrect key is inputted
          const missAudio = new Audio("/sounds/missSound.wav");
          missAudio.currentTime = 0;
          missAudio.volume = 0.7;
          missAudio.play();

          setMultiplier(1);
          setTotalPossible((prev) => prev + 1);

          // Lock input for a short duration after making a mistake
          inputLockedRef.current = true;
          setTimeout(() => {inputLockedRef.current = false;}, 300);


          // Stop spawning for this word
          if (spawnTimeouts.current[activeWordIndex]) {
            clearTimeout(spawnTimeouts.current[activeWordIndex]);
            delete spawnTimeouts.current[activeWordIndex];
          }
        }

        return prev.filter((letter) => letter.wordIndex !== activeWordIndex);
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [running, pianoNotes]);

  // Handle changing songs
  const handleSheetChange = (e) => {
    const selected = e.target.value;
    setCurrentSheetName(selected);
    setCurrentSheet(musicSheets[selected]);
    noteIndexRef.current = 0;
    setLetters([]);
    currentXRef.current = 0;
    chooseNewWord();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#111" }}>
      <select value={currentSheetName} onChange={handleSheetChange} style={{ marginBottom: "10px", fontSize: "16px" }}>
        {Object.keys(musicSheets).map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <div style={{ position: "relative", width: `${gameWidth}px`, height: `${gameHeight}px`, overflow: "hidden", background: "#111", color: "white", border: "2px solid #333", borderRadius: "8px" }}>
        {letters.map((letter) => {
          const borderColor = letter.wordIndex % 2 === 0 ? "red" : "blue";
          return (
            <div key={letter.id} style={
              {
                position: "absolute",
                top: letter.top,
                left: letter.left,
                fontSize: "24px",
                fontWeight: "bold",
                color: "black",
                backgroundColor: "white",
                padding: "6px 10px",
                borderRadius: "6px",
                border: `4px solid ${borderColor}`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                userSelect: "none" }}
              >
              {letter.char}
            </div>
          );
        })}

        <div style={{ position: "absolute", bottom: "150px", left: 0, width: "100%", height: "4px", backgroundColor: "orange" }} />

        <div style={{ position: "absolute", top: "10px", right: "10px", textAlign: "right", color: "white", fontFamily: "monospace", padding: "10px", borderRadius: "8px", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <div style={{ fontSize: "20px", fontWeight: "bold" }}>Score: {score}</div>
          <div style={{ fontSize: "16px", marginTop: "6px" }}>Accuracy: {accuracy.toFixed(1)}%</div>
        </div>

        <div style={{ position: "absolute", bottom: "10px", left: "10px", color: "white", fontSize: "30px", fontWeight: "bold", fontFamily: "monospace", border: "2px solid white", padding: "6px 12px", borderRadius: "8px", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          {multiplier}x
        </div>

        {!running && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "128px", color: "Black", border: "4px black solid", backgroundColor: "rgba(221, 221, 221, 0.7)" }}>PAUSED</div>}

        <button onClick={() => setRunning((prev) => !prev)} style={{ position: "absolute", top: "-50px", left: "50%", transform: "translateX(-50%)" }}>
          {running ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}

export default App;

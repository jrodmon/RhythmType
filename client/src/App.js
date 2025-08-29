import React, { useState, useEffect, useRef } from "react";
import words from "./words.json";
import { musicSheets } from "./musicSheets";

function App() {
  const [letters, setLetters] = useState([]);
  const [running, setRunning] = useState(true);
  const [currentWord, setCurrentWord] = useState("");
  const [wordColor, setWordColor] = useState("red");
  const [currentSheetName, setCurrentSheetName] = useState("Fur Elise");        // default sheet
  const [currentSheet, setCurrentSheet] = useState(musicSheets["Fur Elise"]);

  const spawnTimeout = useRef(null);
  const letterIndexRef = useRef(0);
  const currentXRef = useRef(0);
  const noteIndexRef = useRef(0); // track which note to play next

  const gameWidth = 1000;
  const gameHeight = 600;
  const letterSpacing = 40;

  // Destructure values from JSON music sheet
  const { delayBetweenNotes, pixelsPerInterval, delayPerMovement, pianoNotes } = currentSheet;

  
const nextWordIndexRef = useRef(0);
//let nextWordIndex = 0; // keeps track of word order for alternating colors

  // Pick a new random word
  const chooseNewWord = () => {
    const newWord = words[Math.floor(Math.random() * words.length)];
    // Wrap to left if overflow
    if (currentXRef.current + newWord.length * letterSpacing > gameWidth) {
      currentXRef.current = 0;
    }
    setCurrentWord(newWord);
    letterIndexRef.current = 0;
    setWordColor((prev) => (prev === "red" ? "blue" : "red"));
  };

  useEffect(() => {
    chooseNewWord();
  }, []);

  // Spawn letters sequentially
  useEffect(() => {
    if (!currentWord) return;

    const wordIndex = nextWordIndexRef.current++;
    
    const spawnNextLetter = () => {
      if (!running) return;

      const index = letterIndexRef.current;

      if (index >= currentWord.length) {
        spawnTimeout.current = setTimeout(() => {
          if (running) chooseNewWord();
        }, 100);                    // additional delay after word completion (i dont think this needs to be changed at all ever frfr)
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
      //spawnTimeout.current = setTimeout(spawnNextLetter, 100); 
      spawnTimeout.current = setTimeout(spawnNextLetter, currentSheet.delayBetweenNotes);    // Delay between each letter (read from music sheet JSON)
    };

    spawnNextLetter();

    return () => {
      if (spawnTimeout.current) clearTimeout(spawnTimeout.current);
    };
  }, [currentWord, running, wordColor, currentSheet]);



// NEW FEATURE TO IMPLEMENT: BE ABLE TO ADJUST SPEED OF FALLING LETTERS THROUGH UI

  // Move letters downward
  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setLetters((prev) =>
        prev
          //.map((letter) => ({ ...letter, top: letter.top + 100 }))
          .map((letter) => ({ ...letter, top: letter.top + currentSheet.pixelsPerInterval }))    // pixels moved down each interval (read from music sheet JSON)
          .filter((letter) => letter.top < gameHeight - 1)                    // remove letters that move out of bounds
      );
    //}, 8);
    }, currentSheet.delayPerMovement);            // delay between each downward movement (read from music sheet JSON)

    return () => clearInterval(interval);
  }, [running, currentSheet]);




/*NOTE FROM jrodmonty regarding the code below:
  Made changes to only play music notes when the letter is on the screen
  this would result in two of the same notes to be played
  the solve to this problem was to go into index.js and comment out the React.StrictMode tags
  I am not sure what strict mode does but by commenting it out the problem was solved
*/


//Additionally modify the code to make it easier to change songs
//do stuff with json files and have a dropdown menu to select songs

// Handle typing + pause + play notes
useEffect(() => {
  const handleKeyDown = (e) => {
    const ignoredKeys = [
      "Shift", "CapsLock", "Tab", "Control", "Alt", "Meta",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Enter", "Backspace", "Delete", "Home", "End", "PageUp", "PageDown",
      "Insert", "NumLock", "ScrollLock", "Pause", "PrintScreen",
      "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"
    ];
    if (ignoredKeys.includes(e.key)) return;


    if (e.key === "Escape") {
      setRunning((prev) => !prev);
      return;
    }
    if (!running) return;

    setLetters((prev) => {
      const index = prev.findIndex(
        (letter) => letter.char.toLowerCase() === e.key.toLowerCase()
      );

      if (index !== -1) {
        // Play note for matched letter
        const note = pianoNotes[noteIndexRef.current];
        //const note = moonlight[noteIndexRef.current];
        if (note) {
          const audio = new Audio(`/sounds/${note}.mp3`);
          audio.currentTime = 0;
          audio.play();
          noteIndexRef.current =
            (noteIndexRef.current + 1) % pianoNotes.length;
            //(noteIndexRef.current + 1) % moonlight.length;
        }

        // Remove the matched letter
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      } else {
        // Incorrect key press, plays miss Sound effect
        const missAudio = new Audio("/sounds/missSound.wav");
        missAudio.currentTime = 0;
        missAudio.volume = 0.7;
        missAudio.play();
      }

      return prev;
    });
  };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [running, currentSheet]);


  
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
  <div
    style={{
      display: "flex",
      flexDirection: "column", // stack dropdown above game area
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#111",
    }}
  >
    {/* SONG DROPDOWN */}
    <select
      value={currentSheetName}
      onChange={handleSheetChange}
      style={{ marginBottom: "10px", fontSize: "16px" }}
    >
      {Object.keys(musicSheets).map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>

    {/* GAME AREA */}
    <div
      style={{
        position: "relative",
        width: `${gameWidth}px`,
        height: `${gameHeight}px`,
        overflow: "hidden",
        background: "#111",
        color: "white",
        border: "2px solid #333",
        borderRadius: "8px",
      }}
    >
      {letters.map((letter) => {
        const borderColor = letter.wordIndex % 2 === 0 ? "red" : "blue";
        return (
          <div
            key={letter.id}
            style={{
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
              userSelect: "none",
            }}
          >
            {letter.char}
          </div>
        );
      })}

      {/* Orange input line */}
      <div
        style={{
          position: "absolute",
          bottom: "150px",
          left: 0,
          width: "100%",
          height: "4px",
          backgroundColor: "orange",
        }}
      />

      {!running && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "128px",
            color: "Black",
            border: "4px black solid",
            backgroundColor: "rgba(221, 221, 221, 0.7)",
          }}
        >
          PAUSED
        </div>
      )}

      {/* Pause/Resume Button */}
      <button
        onClick={() => setRunning((prev) => !prev)}
        style={{
          position: "absolute",
          top: "-50px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {running ? "Pause" : "Resume"}
      </button>
    </div>
  </div>
);
}

export default App;
